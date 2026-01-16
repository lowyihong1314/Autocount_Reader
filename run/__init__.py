from .config import flask_path
from flask import Flask,send_file
import os
from .router import api_bp
from _token import sql_server_id,sql_db_name,sql_server_ip,sql_server_password
from .module import db

def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(flask_path, 'templates'),
        static_folder=os.path.join(flask_path, 'static')
    )

    # ========== 1️⃣ 默认数据库：SQLite（table_location） ==========
    sqlite_path = os.path.join(flask_path, "table_location.db")

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"sqlite:///{sqlite_path}"
    )

    # ========== 2️⃣ 额外 bind：SQL Server ==========
    app.config['SQLALCHEMY_BINDS'] = {
        'sqlserver': f'mssql+pyodbc://{sql_server_id}:{sql_server_password}@{sql_server_ip}/{sql_db_name}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=no&TrustServerCertificate=yes'
    }

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ========== 3️⃣ init db ==========
    db.init_app(app)

    # ========== 4️⃣ blueprint ==========
    app.register_blueprint(api_bp, url_prefix="/api")

    # ========== 5️⃣ 前端入口 ==========
    @app.route("/", methods=["GET", "POST"])
    def index():
        return send_file(
            os.path.join(flask_path, "static", "index.html"),
            mimetype="text/html"
        )

    return app