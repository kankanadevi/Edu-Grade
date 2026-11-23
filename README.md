# EduGrade: Student Academic Performance & At-Risk Intervention System

**Academic Assessment Project — Group L (Project Ref: 57)**  
*Scholars Institute of Technology and Management (BSc Data Science & B.Tech CSE)*  
*Semester 1 | Faculty Mentor: Mr. Nitish Kr. Sarma | Team Coordinator: Reena Rabha*

---

## 👥 Team Member Register & Module Ownership

| Member | Name | Responsibility & Module |
|---|---|---|
| Member 1 | **Rezwan Rahman** | Data Preparation & UCI Dataset Cleaning |
| Member 2 | **Nitya Ghosh** | Machine Learning & Model Development (SVC & KNN Pipelines) |
| Member 3 | **Reena Rabha** | Backend Architecture, FastAPI REST API & Team Coordination |
| Member 4 | **Kankana Devi** | Frontend Dashboard, User Interface & Factor Visualizations |

---

## 📌 Project Summary & PRD Objectives

**EduGrade** is an educator-facing early intervention prototype designed to analyze academic, attendance-related, study-habit, and selected socioeconomic features from the **UCI Student Performance (Mathematics)** dataset to:
1. Predict students' final grade bands (**Low**: 0–9, **Average**: 10–13, **Good**: 14–16, **Excellent**: 17–20).
2. Generate an explainable **Low / Medium / High** academic risk indicator.
3. Provide actionable teacher recommendations and comparative factor charts before final assessments.

### Model Evaluation Benchmark (Held-out Test Split, 79 instances)

| Model Architecture | Accuracy | Macro Precision | Macro Recall | Macro F1 | Low-Grade Recall | Status |
|---|---|---|---|---|---|---|
| **Linear SVC (Selected)** | **83.5%** | **80.5%** | **79.4%** | **79.4%** | **92.3%** | 🏆 **Best Model** |
| RBF SVC | 74.7% | 56.4% | 60.2% | 57.3% | 69.2% | Candidate |
| Weighted KNN ($k=5$) | 54.4% | 41.7% | 41.6% | 40.8% | 50.0% | Candidate |
| Baseline (Dummy) | 41.8% | 10.4% | 25.0% | 14.7% | 0.0% | Reference |

> **Model Selection Justification (PRD O3):**  
> Linear SVC achieved the highest overall accuracy (83.5%) and macro precision (80.5%), while delivering **92.3% recall on the Low-grade band**. Minimizing false negatives on at-risk students ensures struggling students receive timely academic support.

---

## 🚀 Live Cloud Deployment Guide

The EduGrade system is decoupled into an API backend and static web frontend, pre-configured for **Render** (Backend) and **Vercel** (Frontend).

```
┌─────────────────────────────────┐           HTTPS REST API          ┌──────────────────────────────────┐
│         Vercel Frontend         │ ────────────────────────────────> │          Render Backend          │
│  (HTML5 / CSS3 / JS / Plotly)   │ <──────────────────────────────── │     (FastAPI / Scikit-Learn)     │
│  https://<your-app>.vercel.app  │       CORS Allowed (Any Origin)   │  https://<your-api>.onrender.com │
└─────────────────────────────────┘                                   └──────────────────────────────────┘
```

---

### Part 1: Deploying the Backend to Render

1. Go to **[Render Dashboard](https://dashboard.render.com/)** and click **New + > Web Service**.
2. Connect your Git repository containing this code.
3. Configure the service settings:
   - **Name**: `edugrade-backend` (or your preferred name)
   - **Language / Runtime**: `Python 3`
   - **Root Directory**: Leave blank (or enter `backend`)
   - **Build Command**:
     ```bash
     pip install -r backend/requirements.txt
     ```
     *(If Root Directory is set to `backend`, use `pip install -r requirements.txt`)*
   - **Start Command**:
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
     *(If Root Directory is set to `backend`, use `uvicorn main:app --host 0.0.0.0 --port $PORT`)*
   - **Instance Type**: `Free`
4. Under **Advanced Settings**:
   - **Health Check Path**: `/health`
5. Click **Create Web Service**.
6. Once deployed, Render will provide a live URL (e.g. `https://edugrade-backend.onrender.com`).
   - Verify by opening `https://edugrade-backend.onrender.com/health` in your browser. It should return `{"status": "healthy", "model_loaded": true}`.

---

### Part 2: Deploying the Frontend to Vercel

1. Go to **[Vercel Dashboard](https://vercel.com/dashboard)** and click **Add New... > Project**.
2. Select your Git repository.
3. In **Project Settings**:
   - **Framework Preset**: `Other`
   - **Root Directory**: `frontend` *(or leave as root; the included `vercel.json` will route to `frontend` automatically)*
   - **Build & Output Settings**: Default (static files)
4. Click **Deploy**.
5. Once deployment finishes, open your Vercel URL (e.g. `https://edugrade.vercel.app`).
6. **Connect Frontend to Render Backend**:
   - In the top-right navbar, click the **API Status badge** (labeled `Checking API...` or `Configure Backend URL`).
   - In the modal that appears, paste your live Render URL (e.g. `https://edugrade-backend.onrender.com`).
   - Click **Test Connection** (it will test live latency and confirm model status).
   - Click **Save URL**.
   - Your frontend is now connected to your cloud backend! The setting is saved locally in your browser.

---

## 💻 Running Locally

### Step 1: Clone the repository & install dependencies

```bash
git clone https://github.com/<your-username>/Edu-Grade.git
cd Edu-Grade

# Install backend dependencies
pip install -r requirements.txt
```

### Step 2: Start the FastAPI Backend Server

```bash
uvicorn backend.main:app --reload --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger API Documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### Step 3: Open the Frontend

You can open `frontend/index.html` or `frontend/login.html` directly in any web browser, or serve it using Python's static server:

```bash
# In a separate terminal
cd frontend
python -m http.server 3000
```
- Open `http://localhost:3000` in your browser.
- Click **"Quick Demo Login"** on the login page to sign in immediately as `Prof. Nitish Kr. Sarma` (Mathematics).
- The dashboard will auto-detect the local backend at `http://127.0.0.1:8000`.

---

## 📂 Project Structure

```
Edu-Grade/
├── backend/
│   ├── main.py                  # FastAPI server with /predict, /health, /model-info, /sample-students
│   ├── requirements.txt         # Production backend dependencies for Render
│   ├── student_model.pkl        # Serialized Linear SVC Pipeline (Preprocessed & Fitted)
│   ├── Procfile                 # Deployment Procfile for Render/Heroku
│   └── render.yaml              # Service blueprint for Render
├── frontend/
│   ├── index.html               # Main educator dashboard with Plotly charts & modals
│   ├── script.js                # Frontend controller (API sync, Plotly rendering, CRUD, fallback)
│   ├── style.css                # Dark modern educator theme
│   ├── login.html               # Teacher authentication & Quick Demo Login
│   ├── login.js                 # Authentication logic & session storage
│   ├── login.css                # Login view styles
│   ├── app.py                   # Streamlit fallback prototype interface
│   └── vercel.json              # Vercel configuration for frontend subfolder
├── ML/
│   └── jpcode/
│       ├── MachineLearning2.ipynb  # Stepwise data inspection, training & evaluation notebook
│       ├── MachineLearning2.py     # Reproducible ML training pipeline script
│       ├── student_cleaned_with_id.csv # UCI Math dataset with identifiers
│       ├── model_comparison.csv    # Benchmark comparison of all candidate models
│       ├── feature_information.csv # 14 feature dictionary and data types
│       ├── models/student_model.pkl# Master serialized model pipeline
│       └── results/                # Confusion matrix visualization plots
├── render.yaml                  # Root Render blueprint specification
├── vercel.json                  # Root Vercel static routing configuration
├── Procfile                     # Root Procfile for web process definition
├── requirements.txt             # Root requirements file
└── README.md                    # Project requirements & deployment guide
```

---

## 🧠 Explainable Risk Evaluation Rules (PRD FR-08)

EduGrade uses a clear, multi-tiered risk matrix combining student metrics and classifier predictions:

1. **High Risk (Red Pill):**
   - Average term marks below passing threshold ($\frac{\text{First\_Term} + \text{Second\_Term}}{2} < 10$).
   - $\ge 2$ past class failures.
   - Classifier predicts **Low** grade band (0–9).
   - *Action:* Immediate remedial tutoring and parental mentoring.

2. **Medium Risk (Yellow Pill):**
   - Average term marks below target band ($\frac{\text{First\_Term} + \text{Second\_Term}}{2} < 14$).
   - High absenteeism ($> 15$ class absences).
   - Classifier predicts **Average** grade band (10–13).
   - *Action:* Attendance review and structured study plan.

3. **Low Risk (Green Pill):**
   - Strong attendance, 0 failures, consistent coursework ($\ge 14$).
   - Classifier predicts **Good** or **Excellent** grade band.
   - *Action:* Continue encouraging positive academic habits.

---

## 🔒 Responsible Use & Ethical Safeguards

- **Decision-Support Only:** EduGrade predictions are early warning indicators and must never replace professional educator judgment or be used for punitive decisions.
- **Privacy First:** No personally identifiable institutional student data is transmitted. All sample profiles use synthetic identities derived from the public UCI dataset.
- **Fairness:** Demographic features are not used as punitive filters; the primary focus is actionable academic habits (study time, attendance continuity, coursework support).
