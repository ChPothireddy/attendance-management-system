from pathlib import Path

from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, origins=["*"])
    db.init_app(app)
    uploads_dir = Path(app.root_path) / 'uploads'
    uploads_dir.mkdir(exist_ok=True)

    # Register blueprints
    from auth import auth_bp
    from routes.admin import admin_bp
    from routes.department import dept_bp
    from routes.faculty import faculty_bp
    from routes.student import student_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(dept_bp)
    app.register_blueprint(faculty_bp)
    app.register_blueprint(student_bp)

    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'Attendance Management System API'}

    @app.route('/api/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(uploads_dir, filename, as_attachment=False)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
