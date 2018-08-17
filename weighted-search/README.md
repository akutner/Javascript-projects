




HOW TO:

Add a term: Double click term, enter term in search box and hit enter, highlight text and click "Add selected as term", click "add term" in recomended terms

Remove a term: "x"

Set Date: Enter date in input box and hit enter

Save query: Enter unique id in "Enter Search ID" box and hit enter

Retrieve query:Reset query and enter query id in "Enter Search ID" box and hit enter

Add Document: Click "Add" button under title








To run outside of Docker:
make sure riithon is in your python path

Backend:

pip install --trusted-host pypi.python.org -r requirements.txt

python -m spacy download en

python /flask-backend/app.py

Frontend:

npm install

npm install react-scripts@1.1.1 -g -slient

npm run start


React Frontend:


App.js:
Top level controller compoent performing backend queries and distributing the data to the rest of the app
State variables: (also documented in the file)
    root_doc :{"doc":{"terms": {},'date':0}}, //Root Document on display
    marked_docs: [],//docs marked as relevant by user
    possible_docs: {"responses":[]},//docs from mlt query
    query_docs: {"responses":[]},//docs from weighted query
    irr_docs: [],//list of irrelevant doc ids
    term_list : [],//ranked list of key terms
    daterange: [default_start_date, default_end_date],//date range for the query
    weights: {},//mapping the terms to their user given weights
    hover: "&",//currently selected term
    show_docs:false,//showing added docs div
    annotations : [],//annotations from the root doc
    recs :{},//recomended terms



Components:
    date-selector: Wrapper for start and end "date-setter" components
    date-setter: Display and set start/end date field
    modify-query: standard query modifier buttons/inputs
    results: wrapper for 2 title-viewer objects
    title-viewer: views results for given list of result objects
    title-item: viewer for DO
    weighted-viewer: Root document viewer





Flask Backend:

Endpoints:

api/get
    Retrieves query DO from given ID

api/set
    Sets ID for given query DO


api/mlt
    Performs and parses MLT query


api/weighted
    Performs and parses weighted query


