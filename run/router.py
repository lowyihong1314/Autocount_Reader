from flask import Blueprint,request,jsonify
import json
from .func import get_sql_table_data,submit_table_location_data

api_bp = Blueprint('api_bp', __name__)

@api_bp.route('/ping')
def ping():
    return 'welcome sql server connector'

@api_bp.route('/db/sqlserver/schema', methods=['GET'])
def sqlserver_schema():
    data = get_sql_table_data()
    return data

@api_bp.route('/db/sqlserver/schema/save_location', methods=['POST'])
def save_sqlserver_table_locations():
    request_data = request.get_json()

    data = submit_table_location_data(request_data)

    return jsonify({"status": "ok", "count": len(data)})
