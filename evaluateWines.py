import os

import base64
import requests
import json

import psycopg2

import requests
from bs4 import BeautifulSoup

from openai import OpenAI






#need to remove this!
conn=psycopg2.connect(os.environ.get('WINE_DATABASE_URL'))
cursor = conn.cursor()

# OpenAI API Key
api_key = os.getenv('OPENAI_API_KEY')
print(api_key)

client = OpenAI()

def fetch_webpage_content(url):
    response = requests.get(url)
    response.raise_for_status()  # This will raise an exception for HTTP errors

    return response.text

# Step 2: Parse the Webpage Content
def extract_text_from_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')

    return soup.get_text()

def call_chatgpt_api(text, custom_prompt):


    completion = client.chat.completions.create(
    model="gpt-4-1106-preview",
    response_format={ "type": "json_object" },
    messages=[
        {"role": "system", "content": "You are a helpful assistant used on a website that helps people find wineries and learn about their selections."},
        {"role": "user", "content": custom_prompt + text}
    ]
    )

    #print(completion.choices[0].message.content)

    return completion.choices[0].message.content

webpage_url = 'http://bucciavineyards.com/buccia-vineyard-wine/'  # Replace with the actual URL

#prompt="would you say the wines described below are predominantly dry, semi-dry, semi-sweet or sweet?\n\n"
prompt="please review the wine selections below and give a rating for each as either dry, semi-dry, semi-sweet or sweet. Total the sccores and give an average. Respond with a JSON object.\n\n"

try:
    html_content = fetch_webpage_content(webpage_url)
    text = extract_text_from_html(html_content)
    response = call_chatgpt_api(text, prompt)

    print(response)  # Or process the response as needed
except Exception as e:
    print(f'An error occurred: {e}')







