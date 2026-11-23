from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
import joblib
import pandas as pd
import os
import json
from datetime import datetime

app = FastAPI(
    title="EduGrade API",
    description="Student Academic Performance & At-Risk Intervention System API (FastAPI + Scikit-Learn)",
    version="1.0.0"
)

# Robust CORS configuration for local development and Vercel frontend deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model loading logic with resilient fallback paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_MODEL_PATHS = [
    os.path.join(BASE_DIR, "student_model.pkl"),
    os.path.join(BASE_DIR, "..", "ML", "jpcode", "models", "student_model.pkl"),
    os.path.join(BASE_DIR, "..", "ML", "jpcode", "student_model.pkl"),
    "student_model.pkl"
]

model = None
MODEL_PATH_USED = None

for p in POSSIBLE_MODEL_PATHS:
    if os.path.exists(p):
        try:
            model = joblib.load(p)
            MODEL_PATH_USED = os.path.abspath(p)
            print(f"[EduGrade API] Successfully loaded model from {MODEL_PATH_USED}")
            break
        except Exception as e:
            print(f"[EduGrade API] Failed to load model at {p}: {e}")

if model is None:
    print("[EduGrade API] Warning: student_model.pkl could not be loaded from any known location.")

# Pydantic schema supporting both standard and legacy field names (G1/G2 or First_Term/Second_Term)
class StudentInput(BaseModel):
    studytime: int = Field(2, ge=1, le=4, description="Weekly study time: 1 (<2h), 2 (2-5h), 3 (5-10h), 4 (>10h)")
    absences: int = Field(4, ge=0, le=93, description="Number of school absences (0-93)")
    failures: int = Field(0, ge=0, le=4, description="Number of past class failures (0-4)")
    age: int = Field(17, ge=15, le=22, description="Student age in years (15-22)")
    schoolsup: int = Field(0, ge=0, le=1, description="Extra educational school support (0: no, 1: yes)")
    famsup: int = Field(0, ge=0, le=1, description="Family educational support (0: no, 1: yes)")
    paid: int = Field(0, ge=0, le=1, description="Extra paid classes (0: no, 1: yes)")
    activities: int = Field(0, ge=0, le=1, description="Extra-curricular activities (0: no, 1: yes)")
    internet: int = Field(1, ge=0, le=1, description="Internet access at home (0: no, 1: yes)")
    higher: int = Field(1, ge=0, le=1, description="Wants to take higher education (0: no, 1: yes)")
    Medu: int = Field(2, ge=0, le=4, description="Mother's education (0: none to 4: higher)")
    Fedu: int = Field(2, ge=0, le=4, description="Father's education (0: none to 4: higher)")
    First_Term: Optional[int] = Field(None, ge=0, le=20, description="First term grade (0-20)")
    Second_Term: Optional[int] = Field(None, ge=0, le=20, description="Second term grade (0-20)")
    G1: Optional[int] = Field(None, ge=0, le=20, description="Alias for First_Term")
    G2: Optional[int] = Field(None, ge=0, le=20, description="Alias for Second_Term")

    @model_validator(mode='after')
    def resolve_term_grades(self):
        # Resolve First_Term / G1
        if self.First_Term is None and self.G1 is not None:
            self.First_Term = self.G1
        elif self.First_Term is None and self.G1 is None:
            self.First_Term = 10
            
        # Resolve Second_Term / G2
        if self.Second_Term is None and self.G2 is not None:
            self.Second_Term = self.G2
        elif self.Second_Term is None and self.G2 is None:
            self.Second_Term = 10
            
        return self


def calculate_risk(grade_band: str, student: StudentInput) -> Dict[str, Any]:
    """
    Explainable Risk Rule implementation complying with PRD Section 5.1 (FR-08):
    High Risk: Average term grade < 10 OR past failures >= 2 OR predicted band is Low.
    Medium Risk: Average term grade < 14 OR absences > 15.
    Low Risk: Performance on track with low risk indicators.
    """
    avg_marks = (student.First_Term + student.Second_Term) / 2.0
    reasons = []

    if avg_marks < 10:
        reasons.append(f"Average term grade ({avg_marks:.1f}/20) is below passing threshold (10)")
    if student.failures >= 2:
        reasons.append(f"High number of past course failures ({student.failures})")
    if grade_band == "Low":
        reasons.append("Model projected final performance in the Low band (0-9)")

    if reasons:
        return {
            "level": "High",
            "reasons": reasons,
            "recommendation": "Immediate academic intervention and targeted mentoring recommended."
        }

    # Medium risk check
    med_reasons = []
    if avg_marks < 14:
        med_reasons.append(f"Average term grade ({avg_marks:.1f}/20) is below target band threshold (14)")
    if student.absences > 15:
        med_reasons.append(f"High rate of class absences ({student.absences} absences recorded)")
    if grade_band == "Average":
        med_reasons.append("Model projected final performance in the Average band (10-13)")

    if med_reasons:
        return {
            "level": "Medium",
            "reasons": med_reasons,
            "recommendation": "Monitor attendance and provide periodic check-ins and tutoring."
        }

    return {
        "level": "Low",
        "reasons": ["Consistent academic progress and low risk flags across all indicators"],
        "recommendation": "Continue encouraging positive study habits and academic engagement."
    }


@app.get("/")
def home():
    return {
        "service": "EduGrade: Student Academic Performance & At-Risk Intervention System",
        "version": "1.0.0",
        "status": "online",
        "model_loaded": model is not None,
        "docs_url": "/docs",
        "endpoints": {
            "predict": "POST /predict",
            "health": "GET /health",
            "model_info": "GET /model-info",
            "sample_students": "GET /sample-students"
        }
    }


@app.get("/health")
def health():
    return {
        "status": "healthy" if model is not None else "degraded",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH_USED,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/model-info")
def model_info():
    comparison_path = os.path.join(BASE_DIR, "..", "ML", "jpcode", "model_comparison.csv")
    models_data = []
    if os.path.exists(comparison_path):
        try:
            cdf = pd.read_csv(comparison_path)
            models_data = cdf.to_dict(orient="records")
        except Exception:
            pass

    return {
        "model_name": "Linear SVC Pipeline",
        "algorithm": "Support Vector Classifier (Linear Kernel)",
        "features": [
            "studytime", "absences", "failures", "age", "schoolsup", "famsup",
            "paid", "activities", "internet", "higher", "Medu", "Fedu",
            "First_Term", "Second_Term"
        ],
        "target": "Grade_Category (Low: 0-9, Average: 10-13, Good: 14-16, Excellent: 17-20)",
        "evaluation_metrics": models_data,
        "best_model_accuracy": 0.8354,
        "best_model_macro_precision": 0.8049,
        "best_model_low_recall": 0.9231
    }


@app.get("/sample-students")
def sample_students():
    """Returns sample curated student records from the UCI dataset for quick demo testing."""
    return [
        {
            "sid": "S001",
            "label": "Rahul Sharma",
            "studytime": 2,
            "absences": 6,
            "failures": 0,
            "age": 18,
            "schoolsup": 1,
            "famsup": 0,
            "paid": 0,
            "activities": 0,
            "internet": 0,
            "higher": 1,
            "Medu": 4,
            "Fedu": 4,
            "First_Term": 5,
            "Second_Term": 6,
            "expected_band": "Low",
            "expected_risk": "High"
        },
        {
            "sid": "S002",
            "label": "Priya Verma",
            "studytime": 2,
            "absences": 4,
            "failures": 0,
            "age": 17,
            "schoolsup": 0,
            "famsup": 1,
            "paid": 0,
            "activities": 0,
            "internet": 1,
            "higher": 1,
            "Medu": 1,
            "Fedu": 1,
            "First_Term": 8,
            "Second_Term": 9,
            "expected_band": "Low",
            "expected_risk": "High"
        },
        {
            "sid": "S003",
            "label": "Riya Sen",
            "studytime": 2,
            "absences": 10,
            "failures": 2,
            "age": 15,
            "schoolsup": 1,
            "famsup": 0,
            "paid": 1,
            "activities": 0,
            "internet": 1,
            "higher": 1,
            "Medu": 1,
            "Fedu": 1,
            "First_Term": 11,
            "Second_Term": 11,
            "expected_band": "Average",
            "expected_risk": "High"
        },
        {
            "sid": "S004",
            "label": "Aman Patel",
            "studytime": 3,
            "absences": 2,
            "failures": 0,
            "age": 15,
            "schoolsup": 0,
            "famsup": 1,
            "paid": 1,
            "activities": 1,
            "internet": 1,
            "higher": 1,
            "Medu": 4,
            "Fedu": 2,
            "First_Term": 15,
            "Second_Term": 14,
            "expected_band": "Good",
            "expected_risk": "Low"
        },
        {
            "sid": "S005",
            "label": "Kavita Rao",
            "studytime": 4,
            "absences": 1,
            "failures": 0,
            "age": 16,
            "schoolsup": 0,
            "famsup": 1,
            "paid": 0,
            "activities": 1,
            "internet": 1,
            "higher": 1,
            "Medu": 4,
            "Fedu": 4,
            "First_Term": 18,
            "Second_Term": 19,
            "expected_band": "Excellent",
            "expected_risk": "Low"
        }
    ]


@app.post("/predict")
def predict(student: StudentInput):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded on this server. Check student_model.pkl."
        )

    try:
        # Prepare DataFrame with exact feature names and order required by the Pipeline
        data = pd.DataFrame([{
            "studytime": student.studytime,
            "absences": student.absences,
            "failures": student.failures,
            "age": student.age,
            "schoolsup": student.schoolsup,
            "famsup": student.famsup,
            "paid": student.paid,
            "activities": student.activities,
            "internet": student.internet,
            "higher": student.higher,
            "Medu": student.Medu,
            "Fedu": student.Fedu,
            "First_Term": student.First_Term,
            "Second_Term": student.Second_Term
        }])

        prediction = model.predict(data)[0]
        grade_band = str(prediction)
        risk_info = calculate_risk(grade_band, student)

        # Return comprehensive keys for frontend compatibility
        return {
            "status": "success",
            "predicted_grade_band": grade_band,
            "grade_band": grade_band,
            "risk_level": risk_info["level"],
            "risk": risk_info["level"],
            "risk_factors": risk_info["reasons"],
            "recommendation": risk_info["recommendation"],
            "model_used": "Linear SVC Pipeline",
            "message": "Prediction successful"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
