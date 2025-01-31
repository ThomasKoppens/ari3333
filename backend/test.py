import ollama
response = ollama.chat(model="deepseek-r1:8b", messages=[{"role": "user", "content": "why is the sky blue"}])
print(response.message.content)