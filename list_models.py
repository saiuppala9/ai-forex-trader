import os
import google.generativeai as genai

def list_available_models():
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY not found")
        return
    
    genai.configure(api_key=api_key)
    
    try:
        for m in genai.list_models():
            print(f"Name: {m.name}")
            print(f"Display Name: {m.display_name}")
            print(f"Description: {m.description}")
            print(f"Generation Methods: {', '.join(m.supported_generation_methods)}")
            print("-" * 50)
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    list_available_models()
