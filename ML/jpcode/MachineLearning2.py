import numpy as np
import pandas as pd

import matplotlib.pyplot as plt
import seaborn as sns

import sys
import sklearn
import joblib

from pathlib import Path
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.dummy import DummyClassifier

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay
)

sns.set_style("whitegrid")

print("All libraries imported successfully!")

#pip install numpy pandas matplotlib seaborn scikit-learn joblib

print("Python:", sys.version.split()[0])
print("NumPy:", np.__version__)
print("Pandas:", pd.__version__)
print("Matplotlib:", plt.matplotlib.__version__)
print("Seaborn:", sns.__version__)
print("Scikit-learn:", sklearn.__version__)
print("Joblib:", joblib.__version__)

import os
print(os.getcwd())
print(os.listdir())

df=pd.read_csv("student_cleaned_with_id (1).csv")
df.head()

df=pd.read_csv("student_cleaned_with_id (1).csv")
df=df.rename(columns={"G1":"First_Term","G2":"Second_Term","G3":"Final_Grade"})
df.to_csv("student_cleaned_with_id.csv",index=False)

df=pd.read_csv("student_cleaned_with_id.csv")
df.head()

# Convert Final_Grade into numeric values
df["Final_Grade"] = pd.to_numeric(df["Final_Grade"], errors="coerce")

# Remove rows where Final_Grade is missing
df = df.dropna(subset=["Final_Grade"])

# Create grade categories
def grade_category(grade):
    if grade <= 9:
        return "Low"
    elif grade <= 13:
        return "Average"
    elif grade <= 16:
        return "Good"
    else:
        return "Excellent"

df["Grade_Category"] = df["Final_Grade"].apply(grade_category)

# Display category counts
print(df["Grade_Category"].value_counts())

# Remove unnecessary columns
X = df.drop(
    columns=[
        "student_id",
        "student_name",
        "Final_Grade",
        "Grade_Category"
    ],
    errors="ignore"
)

# Target column
y = df["Grade_Category"]

print("Input features:")
print(X.columns.tolist())

print("\nTarget:")
print(y.name)

print("\nInput shape:", X.shape)
print("Target shape:", y.shape)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print("Training data:", X_train.shape)
print("Testing data:", X_test.shape)

print("Training target:", y_train.shape)
print("Testing target:", y_test.shape)

# Find numerical columns
numeric_columns = X.select_dtypes(
    include=["int64", "float64"]
).columns

# Find categorical columns
categorical_columns = X.select_dtypes(
    include=["object", "category", "bool"]
).columns

# Create preprocessing steps
preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), numeric_columns),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_columns)
    ]
)

print("Numerical columns:", list(numeric_columns))
print("Categorical columns:", list(categorical_columns))
print("Preprocessing created successfully!")

# Baseline model
baseline_model = Pipeline([
    ("preprocessing", preprocessor),
    ("model", DummyClassifier(strategy="most_frequent"))
])

# Linear SVC
linear_svc = Pipeline([
    ("preprocessing", preprocessor),
    ("model", SVC(kernel="linear"))
])

# RBF SVC
rbf_svc = Pipeline([
    ("preprocessing", preprocessor),
    ("model", SVC(kernel="rbf"))
])

# Distance-weighted KNN
knn_model = Pipeline([
    ("preprocessing", preprocessor),
    ("model", KNeighborsClassifier(
        n_neighbors=5,
        weights="distance"
    ))
])

# Store all models
models = {
    "Linear SVC": linear_svc,
    "RBF SVC": rbf_svc,
    "Weighted KNN": knn_model
}

print("All four model pipelines are ready!")

# Train baseline
baseline_model.fit(X_train, y_train)

print("Baseline model trained successfully!")

# Train three candidate models
for name, model in models.items():
    model.fit(X_train, y_train)
    print(name, "trained successfully!")

# Store evaluation results
results = []

# Include baseline and candidate models
all_models = {
    "Baseline": baseline_model,
    **models
}

for name, model in all_models.items():

    # Predict test data
    y_pred = model.predict(X_test)

    # Calculate evaluation metrics
    accuracy = accuracy_score(y_test, y_pred)

    precision = precision_score(
        y_test, y_pred,
        average="macro",
        zero_division=0
    )

    recall = recall_score(
        y_test, y_pred,
        average="macro",
        zero_division=0
    )

    f1 = f1_score(
        y_test, y_pred,
        average="macro",
        zero_division=0
    )

    # Calculate Low grade recall
    low_recall = recall_score(
        y_test,
        y_pred,
        labels=["Low"],
        average=None,
        zero_division=0
    )[0]

    # Save results
    results.append({
        "Model": name,
        "Accuracy": accuracy,
        "Macro Precision": precision,
        "Macro Recall": recall,
        "Macro F1": f1,
        "Low Recall": low_recall
    })

    print("\nModel:", name)

    print(classification_report(
        y_test,
        y_pred,
        labels=["Low", "Average", "Good", "Excellent"],
        zero_division=0
    ))

print("Evaluation completed successfully!")

comparison_df = pd.DataFrame(results)

print(comparison_df.round(3))

for name, model in all_models.items():

    y_pred = model.predict(X_test)

    cm = confusion_matrix(
        y_test,
        y_pred,
        labels=["Low", "Average", "Good", "Excellent"]
    )

    display_matrix = ConfusionMatrixDisplay(
        confusion_matrix=cm,
        display_labels=["Low", "Average", "Good", "Excellent"]
    )

    display_matrix.plot(cmap="Blues")

    plt.title(name + " Confusion Matrix")
    plt.show()

# Remove baseline from model selection
candidate_results = comparison_df[
    comparison_df["Model"] != "Baseline"
]

# Sort using macro precision and Low Recall
candidate_results = candidate_results.sort_values(
    by=["Macro Precision", "Low Recall"],
    ascending=False
)

print("Model ranking:")
print(candidate_results[[
    "Model",
    "Macro Precision",
    "Low Recall"
]])

best_model_name = candidate_results.iloc[0]["Model"]

print("\nBest model:", best_model_name)

# Save comparison table
comparison_df.to_csv(
    "model_comparison.csv",
    index=False
)

print("Model comparison table saved successfully!")

# Create a folder for results
Path("results").mkdir(exist_ok=True)

for name, model in all_models.items():

    y_pred = model.predict(X_test)

    cm = confusion_matrix(
        y_test,
        y_pred,
        labels=["Low", "Average", "Good", "Excellent"]
    )

    display_matrix = ConfusionMatrixDisplay(
        confusion_matrix=cm,
        display_labels=["Low", "Average", "Good", "Excellent"]
    )

    display_matrix.plot(cmap="Blues")

    plt.title(name + " Confusion Matrix")

    # Save confusion matrix
    file_name = name.replace(" ", "_")

    plt.savefig(
        "results/" + file_name + "_confusion_matrix.png"
    )

    plt.show()
    plt.close()

print("All confusion matrices saved successfully!")

# Select the best trained pipeline
best_pipeline = models[best_model_name]

# Save the complete pipeline
joblib.dump(best_pipeline, "student_model.pkl")

print("Best model:", best_model_name)
print("Model saved successfully!")

# Load saved model
loaded_model = joblib.load("student_model.pkl")

# Take one sample from test data
sample_student = X_test.iloc[[0]]

# Predict grade category
prediction = loaded_model.predict(sample_student)

print("Student Input:")
print(sample_student)

print("\nPredicted Grade Category:", prediction[0])

print("Selected Model:", best_model_name)

# Get the selected Linear SVC pipeline
best_pipeline = models["Linear SVC"]

print("Model ready for saving!")

import joblib

joblib.dump(best_pipeline, "student_model.pkl")

print("student_model.pkl saved successfully!")

print("INPUT FEATURE NAMES AND DATA TYPES")
print("----------------------------------")

for column in X.columns:
    print(column, ":", X[column].dtype)

print("----------------------------------")
print("Total input features:", len(X.columns))

feature_info = pd.DataFrame({
    "Feature Name": X.columns,
    "Data Type": X.dtypes.astype(str).values
})

feature_info.to_csv("feature_information.csv", index=False)

print(feature_info)
print("\nFeature information saved successfully!")

# Load the saved model
loaded_model = joblib.load("student_model.pkl")

print("Saved model loaded successfully!")

# Take one student record from test data
new_student = X_test.iloc[[0]].copy()

# Predict using the loaded model
prediction = loaded_model.predict(new_student)

print("New Student Input:")
print(new_student)

print("\nPredicted Grade Category:", prediction[0])

if len(prediction) == 1:
    print("SUCCESS!")
    print("Model accepts new student input.")
    print("Prediction generated successfully.")
else:
    print("Prediction test failed.")

import joblib
from pathlib import Path

model_folder = Path("models")
model_folder.mkdir(parents=True, exist_ok=True)

joblib.dump(
    best_pipeline,
    model_folder / "student_model.pkl"
)

print("Model saved successfully!")

import pandas as pd
import joblib

# Create a manually entered student record
new_student_data = {
    "studytime": 3,
    "absences": 2,
    "failures": 0,
    "age": 16,
    "schoolsup": 0,
    "famsup": 1,
    "paid": 0,
    "activities": 1,
    "internet": 1,
    "higher": 1,
    "Medu": 3,
    "Fedu": 2,
    "First_Term": 14,
    "Second_Term": 15
}

# Arrange columns in exactly the same order as model training
new_student = pd.DataFrame([new_student_data], columns=X.columns)

# Load the saved model
loaded_model = joblib.load("models/student_model.pkl")

# Generate prediction
prediction = loaded_model.predict(new_student)

print("New Student Details:")
print(new_student)

print("\nPredicted Grade Category:", prediction[0])
print("\nNew student prediction test completed!")

from pathlib import Path

required_files = [
    "student_model.pkl",
    "models/student_model.pkl",
    "model_comparison.csv",
    "feature_information.csv",
    "results/Baseline_confusion_matrix.png",
    "results/Linear_SVC_confusion_matrix.png",
    "results/RBF_SVC_confusion_matrix.png",
    "results/Weighted_KNN_confusion_matrix.png"
]

print("FINAL FILE VERIFICATION")
print("-----------------------")

for file in required_files:
    if Path(file).exists():
        print("FOUND:", file)
    else:
        print("MISSING:", file)

import joblib

# Load the model that Reena will use
final_model = joblib.load("models/student_model.pkl")

# Check the feature names stored by the model
print("FEATURE VERIFICATION")
print("--------------------")

print("Number of features:", len(final_model.feature_names_in_))

print("Feature names:")
print(list(final_model.feature_names_in_))

# Compare with the notebook's training features
if list(final_model.feature_names_in_) == list(X.columns):
    print("\nSUCCESS: Feature names and order match!")
else:
    print("\nERROR: Feature names or order do not match!")

print("MODEL INFORMATION")

print("Model type:", type(final_model))

print("Has preprocessing pipeline:",
      hasattr(final_model, "steps"))

print("Has prediction method:",
      hasattr(final_model, "predict"))

import joblib
from pathlib import Path

# Create models folder
model_folder = Path("models")
model_folder.mkdir(parents=True, exist_ok=True)

# Save the trained pipeline
model_path = model_folder / "student_model.pkl"

joblib.dump(final_model, model_path)

print("Model saved successfully!")
print("Model location:", model_path.resolve())
print("File exists:", model_path.exists())

