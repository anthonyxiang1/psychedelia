## $env:FLASK_APP = "server.py"
## flask run

import os
import base64
import boto3
from config import ACCESS_KEY,SECRET_KEY
import random, string
from flask import Flask, flash, request, redirect, url_for, render_template, send_from_directory, jsonify
from werkzeug.utils import secure_filename

#style transfer libraries
from PIL import Image
from io import BytesIO
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.optim as optim
import requests
from torchvision import transforms, models
from torchvision.utils import save_image

app = Flask(__name__)
app.secret_key = "super secret key"


### FXNS
def randomstr(length):
    """
    args:
    length(int) how long the string is

    returns a randomly generated lowercase string
    """
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def load_image(img_path, max_size = 400, shape=None):
    '''
    args:
    img_path(str) the url or file path of image
    max_size(int) how big the largest size should be
    shape(int) if a shape is specified

    returns an image transformed and normalized to a tensor representation
    '''
    if "http" in img_path:
        response = requests.get(img_path)
        image = Image.open(BytesIO(response.content)).convert('RGB')
    else:
        image = Image.open(img_path).convert('RGB')

    if max(image.size) > max_size:
        size = max_size
    else:
        size = max(image_size)

    if (shape is not None):
        size = shape

    in_transforms = transforms.Compose([
                    transforms.Resize(size),
                    transforms.ToTensor(),
                    transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))])

    image = in_transforms(image)[:3,:,:].unsqueeze(0)
    return image

def im_convert(tensor):
    """ Display a tensor as an image. """
    
    image = tensor.to("cpu").clone().detach()
    image = image.numpy().squeeze()
    image = image.transpose(1,2,0)
    image = image * np.array((0.229, 0.224, 0.225)) + np.array((0.485, 0.456, 0.406))
    image = image.clip(0, 1)

    return image

def get_features(image, model, layers=None):
    """ forward pass through features
    """
    ## content representation
    if layers is None:
        layers = {'0': 'conv1_1',
                  '5': 'conv2_1', 
                  '10': 'conv3_1', 
                  '19': 'conv4_1',
                  '21': 'conv4_2',  
                  '28': 'conv5_1'}
        
    features = {}
    x = image
    # model._modules is a dictionary holding each module in the model
    for name, layer in model._modules.items():
        x = layer(x)
        if name in layers:
            features[layers[name]] = x
            
    return features

def gram_matrix(tensor):
    '''
    calculate the gram matrix of a tensor
    '''
    _, d,h,w = tensor.size()

    #reshape tensor
    tensor = tensor.view(d, h*w)
    gram = torch.mm(tensor, tensor.t())
    return gram

def algo(content_url, filename, id):
    #### STYLE TRANSFER CODE GOES HERE

    vgg = models.vgg19(pretrained=True).features  # get the main layers (not the last 3 fully connected layers)
    for param in vgg.parameters():  # freeze weights
        param.requires_grad_(False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    vgg.to(device)

    # set up content and style
    content = load_image(content_url).to(device)
    style = load_image(filename, shape=content.shape[-2:]).to(device)

    content_features = get_features(content, vgg)
    style_features = get_features(style, vgg)

    style_grams = {layer: gram_matrix(style_features[layer]) for layer in style_features}

    # target image, Gatys used a white noise image in the paper but I'll start with the content image
    target = content.clone().requires_grad_(True).to(device)

    # hyperparameters
    style_weights = {'conv1_1': 0.8,
                 'conv2_1': 0.8,
                 'conv3_1': 1,
                 'conv4_1': 1,
                 'conv5_1': 1}
    
    content_weight = 1 # alpha
    style_weight = 1e6 # beta
    lr = 0.8
    #steps = int(num_steps)
    steps = 1

    # deep learning runs
    optimizer = optim.Adam([target], lr)  # changes the weights
    
    for ii in range(1, steps + 1):
        target_features = get_features(target, vgg)
        content_loss = torch.mean((target_features['conv4_2'] - content_features['conv4_2'])**2)  # this layer has the content representation
        style_loss = 0

        for layer in style_weights:
            target_feature = target_features[layer]  # target image style representations
            target_gram = gram_matrix(target_feature)
            _, d, h, w = target_feature.shape
            style_gram = style_grams[layer]  # style image style representations
            layer_style_loss = style_weights[layer] * torch.mean((target_gram - style_gram)**2)  # style loss for one layer weighted
            style_loss += layer_style_loss / (d*h*w)

        total_loss = content_weight*content_loss + style_weight*style_loss

        #updates
        optimizer.zero_grad()
        total_loss.backward()
        optimizer.step()

        print('Step: ', ii)
        print('Total loss: ', total_loss.item())

    os.remove(filename)  # get rid of the style image
    target_path = './static/results/result_' + id + '.png'
    plt.imsave(target_path, im_convert(target))
    
    content_path = './static/content/content_' + id + '.png'
    plt.imsave(content_path, im_convert(content))

    return target_path, content_path

### ROUTES

@app.route('/')
def main():
    return render_template('home.html')

@app.route('/transfer/', methods=['GET', 'POST'])
def img_upload():
    response = request.get_json()
    content_url = response['content']  # user input url
    img_url = response['style']   # base64 url of canvas drawing
    #num_steps = response['steps']
    imgdata = base64.b64decode(img_url[22:])

    # making unique string for the style image and making a file
    id = randomstr(10)
    filename = './static/style/' + id + '.png'
    with open(filename, 'wb') as f:
        f.write(imgdata)

    target_path, content_path = algo(content_url, filename, id)
    
    response['contentResize'] = content_path
    response['final'] = target_path

    session = boto3.Session(
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
    )
    s3 = session.resource('s3', aws_access_key_id=ACCESS_KEY, aws_secret_access_key=SECRET_KEY)
    s3.Bucket('psychedeliafinal').put_object(Key=id+".png", Body=open(target_path, 'rb'))

    return jsonify(response)

@app.route('/reset/', methods=['GET', 'POST'])
def reset():
    response = request.get_json()
    content_url = response['content_path']  # user input url
    final_url = response['final_path']
    os.remove(content_url)
    os.remove(final_url)
    return jsonify(response)
    
@app.after_request
def add_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return response

if __name__ == "__main__":
    app.run()