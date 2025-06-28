from flask import Flask
from flask_cors import CORS
from .routes import main  # this imports the Blueprint

def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    
    from .routes import main
    app.register_blueprint(main, url_prefix="/api")  # Optional prefix

    return app