==================================
Step 1 

sudo apt update
sudo apt install -y python3-venv

==================================
Step 2 

python3 -m venv venv
source venv/bin/activate

==================================
Step 3 -- install reuirements.txt

pip install --upgrade pip
pip install -r requirements.txt

==================================
Step 4 -- visit http://127.0.0.1:5050/api/ping

==================================
Step 5 setup frontend using vite(insall Node.js , vite ) and put the index.html to /static/index.html (open one more terminal)

cd frontend
npm install

===================================

Step 6 before start python3 wsgi.py must be confirm device have [ODBC Driver 18 for SQL Server]
