import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import markdown
import subprocess
import ollama
import config

app = Flask(__name__)
CORS(app)
api_url = "http://localhost:11434/deepseek-r1:8b"
message_history = []


@app.route('/api/start', methods=['GET'])
def get_data():
    message_history.clear()
    message_history.append({"role": "system", "content": config.initial_message})

    result = get_response(message_history)
    thoughts, output = split_thoughts(result)
    print(output)
    return jsonify({"thoughts": thoughts, "output": output})


@app.route('/api/question', methods=['POST'])
def process_prompt():
    # Get the question from the request
    data = request.get_json()
    prompt = data.get("prompt", "")

    message_history.append({"role": "user", "content": prompt})

    # Run a command and capture the output
    result = get_response(message_history)
    thoughts, output = split_thoughts(result)
    print("\n\nTHOUGHT")
    print(thoughts)
    print("\n\nOUTPUT")
    print(output)

    # Return the result as JSON
    return jsonify({"thoughts": thoughts, "output": output})

@app.route('/api/feedback', methods=['POST'])
def feedback():
    # Determine the type of feedback
    data = request.get_json()
    feedback_messages = data.get("feedback_messages", "")

    add_feedback_messages(feedback_messages)

    result = get_response(message_history)
    thoughts, output = split_thoughts(result)

    # Return the result as JSON
    return jsonify({"thoughts": thoughts, "output": output})


@app.route('/api/geoip', methods=["POST"])
def geoip():
    try:
        # The third-party API URL
        url = 'https://greipapi.com/scoring/profanity'
        headers = {"Authorization": "Bearer 1bc4c05ee6f1106d9869fc920d26d511"}
        text = request.get_json().get("text", "fuck")

        # Make the request to the third-party API
        response = requests.request("GET", url, headers=headers, params=text)

        # Check if the request was successful
        if response.status_code == 200:
            # Return the JSON data from the third-party API
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Failed to fetch data from the API'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def start_ollama():
    response = ollama.ps()
    if "deepseek-r1:8b" not in response:
        subprocess.Popen("ollama serve")


def get_response(prompts):
    """
    This is the function which actually interfaces with deepseek.  Every message in the message history is passed to
    the model for it to have the necessary context for a coherent response.
    """
    print("RESPONDING TO MESSAGES:")
    for prompt in prompts:
        print(prompt["content"])
    response = requests.post("http://localhost:11434/api/chat",
                             json={"model": "deepseek-r1:8b", "messages": prompts, "stream": False})
    print(response.json())
    message_history.append({"role": "assistant", "content": response.json()["message"]["content"]})
    return response.json()["message"]["content"]


def split_thoughts(response):
    # Deepseek r1 works by first thinking about how it is going to tackle the question, so this function
    # is dedicated to splitting the thinking text from the output
    print("\n\n\n\nSPLITTING:")
    print(response)
    try:
        response = response.replace("<think>", "")
    except:
        print("NO OPENING THINK TAG FOUND")
    try:
        thoughts, output = response.split("</think>")
    except Exception as e:
        # For some reason, the <think> tags are either not present or more than one closing tag exists
        print("CLOSE THINK TAG ERROR", e)
        thoughts = None
        output = response
    if thoughts:
        thoughts = markdown.markdown(thoughts)
    if output:
        output = markdown.markdown(output)
    return thoughts, output

def add_feedback_messages(feedback_messages):
    for feedback_message in feedback_messages:
        message_history.append({"role": "system", "content": feedback_message})


if __name__ == '__main__':
    app.run(debug=True)
