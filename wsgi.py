
from run import create_app
from _token import port_num
from run.module import db

app = create_app()

with app.app_context():
    db.create_all()
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=port_num, debug=True)

# python3 wsgi.py