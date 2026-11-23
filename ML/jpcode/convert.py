import json
nb = json.load(open("MachineLearning2.ipynb"))
code = "\n\n".join(["".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code"])
open("MachineLearning2.py", "w").write(code)
print("Done")
