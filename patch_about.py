with open("src/pages/About.jsx", "r") as f:
    content = f.read()

# Replace the text
old_text = "This lived experience informs his proactive stance on Protected Vital Systems and Housing Sovereignty—ensuring these systems serve people, not corporate interests."
new_text = "This lived experience informs his proactive stance on Protected Vital Systems and Housing Sovereignty—ensuring these systems serve people, not corporate interests."

# It's already there! Let's check
if old_text in content:
    print("Text already exists in About.jsx")
else:
    print("Text not found")
