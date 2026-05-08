from pathlib import Path

from flask import Flask, send_from_directory
from flask_cors import CORS
from sqlalchemy import inspect, text
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

    def _ensure_column(table_name, column_sql):
        inspector = inspect(db.engine)
        columns = [c['name'] for c in inspector.get_columns(table_name)]
        col_name = column_sql.split()[0]
        if col_name not in columns:
            db.session.execute(text(f'ALTER TABLE {table_name} ADD COLUMN {column_sql}'))
            db.session.commit()

    with app.app_context():
        # Ensure tables exist for the current SQLAlchemy models
        try:
            db.create_all()
        except Exception as e:
            print('DB create_all warning:', repr(e))

        # add new fields if missing (safe, idempotent)
        try:
            _ensure_column('sections', 'program_id INTEGER')
            _ensure_column('sections', 'updated_at DATETIME')
            _ensure_column('subjects', 'periods INTEGER')
            _ensure_column('subjects', "subject_type TEXT DEFAULT 'Common'")
            _ensure_column('subjects', 'batch_id INTEGER')
            _ensure_column('subjects', 'program_id INTEGER')
            _ensure_column('students', "student_type TEXT DEFAULT 'Regular'")
            _ensure_column('students', 'passport_number TEXT')
            _ensure_column('students', 'category TEXT')
            _ensure_column('students', 'entrance_marks REAL DEFAULT 0')
            _ensure_column('students', 'created_at DATETIME')
            _ensure_column('format_subjects', 'mapped_subject_code TEXT')
            _ensure_column('section_subject_assignments', 'format_code TEXT')
        except Exception as e:
            print('Schema migration warning:', repr(e))

    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'Attendance Management System API'}

    @app.route('/api/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(uploads_dir, filename, as_attachment=False)

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))  # Render sets PORT
    app.run(host="0.0.0.0", port=port, debug=False)

