## $env:FLASK_APP = "server.py"
## flask run

import os
import base64
import random, string
from flask import Flask, flash, request, redirect, url_for, render_template, send_from_directory, jsonify
from werkzeug.utils import secure_filename

from PIL import Image
from io import BytesIO
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.optim as optim
import requests
from torchvision import transforms, models

app = Flask(__name__)
app.secret_key = "super secret key"

def randomstr(length):
   letters = string.ascii_lowercase
   return ''.join(random.choice(letters) for i in range(length))

@app.route('/')
def main():
    return render_template('home.html')

@app.route('/transfer/', methods=['GET', 'POST'])
def img_upload():
    response = request.get_json()
    content_url = response['content']
    img_url = response['style']
    imgdata = base64.b64decode(img_url[22:])
    
    id = randomstr(10)
    filename = './style/' + id + '.png'  # I assume you have a way of picking unique filenames
    with open(filename, 'wb') as f:
        f.write(imgdata)

    
    
    return jsonify(response)
    #return render_template('home.html', content=content_url, result=img_url)

    
@app.after_request
def add_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return response

if __name__ == "__main__":
    app.run(debug=True)

