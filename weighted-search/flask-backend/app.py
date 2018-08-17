from itertools import islice
from riithon import dedupe
from flask import Flask, render_template, jsonify, request
from riithon import mltvis
from flask_cors import CORS
import json
from elasticsearch import Elasticsearch, helpers
from datetime import datetime as parser
from query_utils import ESQuery
#from riithon.dedupe import DeduplicateLSH
import os


app = Flask(__name__)
CORS(app)
knowndups= set()
mlt_whitelist = {}#turn this into a map of id to num dups
weighted_whitelist= {}
lshthresh= float(os.environ.get("LSH_THRESHOLD",.6))
lshter = int(os.environ.get("LSH_ITERATIONS",180))
lshshing = int(os.environ.get("LSH_SHINGLES",4))
weighted_to_id = {}
mlt_to_id = {}


save_search_index = os.environ.get("SEARCH_INDEX","weighted_do")
save_search_type = os.environ.get("SEARCH_DO","weight_query_doc")
save_search_es = os.environ.get("SEARCH_SERVER","http://efreeti.lab.rii.io")
save_search_es+=":9200"

doc_index = os.environ.get("DOC_INDEX","mattis_do")
doc_type = os.environ.get("DOC_TYPE","TcfModel_Document")
doc_es = os.environ.get("DOC_SERVER","http://efreeti.lab.rii.io")
doc_es+=":9200"


ann_field = "TcfModel_hasAnnotationList"
title_field="TcfModel_hasTitle"
content_field="TcfModel_hasContent"
date_field="TcfModel_hasPubDate"



num_docs_out= 20
max_query_terms = 25





@app.route('/')
def index():
    return "index"


"""
Endpoint takes MLT query and target id
Parses and returns document and top TF IDF terms
"""
@app.route('/api/orig', methods = ['POST'])
def getOrig():
    doc = getOrigDoc(request)
    doc['dup'] = []
    if doc['id'] in weighted_whitelist.keys():
        doc['dup'] = weighted_whitelist[doc['id']]
    if doc['id'] in mlt_whitelist.keys():
        doc['dup'] += mlt_whitelist[doc['id']]
    return (jsonify(doc))
"""
Takes MLT query
Parses and returns document and top TF IDF terms
Deduplicates
"""

@app.route('/api/mlt', methods =['POST'])
def mltQuery():
    docs = getdocs(request.json,"mlt")
    for doc in docs:
        doc['dup'] = []
        if doc['id'] in weighted_whitelist.keys():
            doc['dup'] = weighted_whitelist[doc['id']]
        if doc['id'] in mlt_whitelist.keys():
            doc['dup'] += mlt_whitelist[doc['id']]
    return (jsonify(docs))

"""

Takes weighted query
Parses and returns document and top TF IDF terms
Deduplicates

"""
@app.route('/api/weighted',methods = ['POST'])
def weightedQuery():
    docs = getdocs(request.json, "weighted")
    for doc in docs:
        doc['dup'] = []
        if doc['id'] in weighted_whitelist.keys():
            doc['dup'] = weighted_whitelist[doc['id']]
        if doc['id'] in mlt_whitelist.keys():
            doc['dup'] += mlt_whitelist[doc['id']]
    return (jsonify(docs))

"""
Saves current query

"""
@app.route('/api/save',methods = ['POST'])
def saveQuery():
    content = request.json
    print(content)
    _id = content['id']
    es_ann.index(index=save_search_index,
            body=content,
            doc_type=save_search_type,
            id=_id)
    return json.dumps({'success':True}),200, {'ContentType':'application/json'}
"""
Retrieves weighted query from given id
"""

@app.route('/api/get',methods = ['POST'])
def getQuery():
    content = request.json
    _id = content['id']
    res = es_ann.get(index=save_search_index,
            doc_type=save_search_type,
            id = _id)
    
    return jsonify(res)
"""
Cutoff query

"""


@app.route('/api/cut', methods = ['POST'])
def getCutoff():
    content = request.json
    cutoff = content['cutoff']
    query = content['query']
    tp = content['tp']
    docs = getdocs(query,tp,cutoff)
    for doc in docs:
        doc['dup'] = []
        if doc['id'] in weighted_whitelist.keys():
            doc['dup'] = weighted_whitelist[doc['id']]
        if doc['id'] in mlt_whitelist.keys():
            doc['dup'] = doc['dup'].append(mlt_whitelist[doc['id']])
    return (jsonify(docs))


@app.route('/api/hist',methods = ['POST'])
def getHist():
    print(request.json)
    return (jsonify(getHistogram(request.json)))

@app.route('/api/hist_samp',methods = ['POST'])
def getHistSamp():
    print(request.json)
    return (jsonify(mltvis.getGraphsQuery(request.json,doc_es,doc_index)))

def getHistogram(query):
    es_query = ESQuery(doc_es,doc_index)
    scanner= es_query.get_query_scanner(query,batch_size=20)
    #docs = parseWeightedResults(scanner)
    docs = mltvis.getGraphs(scanner)
    return docs

def getOrigDoc(request):
    content = request.json
    es_query = ESQuery(doc_es,doc_index)
    query = content['query']
    _id = content['id']
    scanner = es_query.get_query_scanner(query,batch_size=50)
    doc = parseOrig(scanner,_id)
    doc = islice(doc,1)
    ls = list(doc)
    try:
        return ls[0]
    except:
        raise Exception("Orig not found")

def getdocs(content, tp, cutoff = -1): 
    es_query = ESQuery(doc_es,doc_index)
    query = content
    scanner= es_query.get_query_scanner(query,batch_size=20)
    #docs = parseWeightedResults(scanner)
    docs = parseResults(scanner,tp, cutoff)
    docs = islice(docs,num_docs_out)
    return list(docs)


def getTopWeightedTerms(explanation):
    outlist= {}
    termlist= explanation['details'];
    termlist.pop(0);
    for term in termlist:
        try:
            parsedTerm=parseTerm(term['details'][0])
            outlist[parsedTerm] = term['value']    
        except:
            print(term)
            pass

    return outlist





def parseOrig(results,_id):
    for doc in results:
        i = doc['_id']
        if i==_id:
            out_doc = {'title':'','content':'','date':'','annotations':[],'id':i,'terms':[],'val':-1}
            
            explanation = doc["_explanation"]
            
            src = doc["_source"]
            out_doc['val'] = explanation['value']
            terms = getTopTerms(explanation)
            text = src.get(content_field)
            out_doc['content'] = text
            if isinstance(text, (list,)):
                out_doc['content'] = text[0]
            annotations = getAnnotations(src)
            out_doc['annotations']= annotations
            if not src.get(title_field) is None:
                if isinstance(src[title_field], (list,)):
                    out_doc['title'] = src[title_field][0]
                else:
                    out_doc['title'] = src[title_field]
            if not src.get(date_field) is None:
                if isinstance(src[date_field], (list,)):
                    out_doc['date'] = src[date_field][0]
                else:
                    out_doc['date'] = src[date_field]
            out_doc['terms'] = terms
            out_doc['dup'] = []
            yield(out_doc)
        else:
            continue
        

#returns a list of DO's
def parseResults(results,tp,cutoff):
    cutoff = float(cutoff)
    #results = results['hits']['hits']
    print("parsing results")
    first = True
    count =0
    for doc in results:
        if doc['_id'] in knowndups:
            continue
        i = doc['_id']

        out_doc = {'title':'','content':'','date':'','annotations':[],'id':i,'terms':[],'val':-1}
        explanation = doc["_explanation"]

        if first == True:
            cutoff*=explanation['value']
            first = explanation['value']
        if cutoff >-1 and cutoff<explanation['value']:
            count +=1
            continue
        src = doc["_source"]
        out_doc['val'] = explanation['value']
        if cutoff >0:
            try:
                out_doc['val'] /= first
                out_doc['val'] = round(out_doc['val'],4)
                print(out_doc['val'])
            except:
                pass
        annotations = getAnnotations(src)
        out_doc['annotations']= annotations
        if tp == "mlt":
            terms = getTopTerms(explanation)
        else:
            terms = getTopWeightedTerms(explanation)
        text = src.get(content_field)
        if not text is None:
            if i not in mlt_whitelist.keys() and i not in weighted_whitelist.keys():
                if isinstance(text, (list,)):
                    text = text[0]
                if tp == "mlt":
                    nb,mh_id = dedupeMLT.add_test_save(text)
                    mlt_to_id[i] = mh_id
                else:
                    nb,mh_id = dedupeWeighted.add_test_save(text)
                    weighted_to_id[i]= mh_id
                if len(nb):
                    knowndups.add(i)
                    if(tp == "mlt"):
                        for doc in mlt_whitelist:
                            hh = mlt_to_id[doc]
                            for n in nb:
                                if str(hh) == str(n) :
                                    if doc in mlt_whitelist:
                                        mlt_whitelist[doc].append(i)
                    else:
                        for doc in weighted_whitelist:
                            hh = weighted_to_id[doc]
                            for n in nb:
                                if str(hh) == str(n) :
                                    if doc in weighted_whitelist:
                                        weighted_whitelist[doc].append(i)
                    continue
                else:
                    out_doc['content'] = text
                    if isinstance(text, (list,)):
                        out_doc['content'] = text[0]
                    if tp =="mlt":
                        mlt_whitelist[i] = []
                    else:
                        weighted_whitelist[i]= []
            else:
                out_doc['content'] = text
                if isinstance(text, (list,)):
                    out_doc['content'] = text[0]
        if not src.get(title_field) is None:
            if isinstance(src[title_field], (list,)):
                out_doc['title'] = src[title_field][0]
            else:
                out_doc['title'] = src[title_field]

        if not src.get(date_field) is None:
            if isinstance(src[date_field], (list,)):
                out_doc['date'] = src[date_field][0]
            else:
                out_doc['date'] = src[date_field]
                

        out_doc['terms'] = terms
        out_doc['count'] = count
        yield(out_doc)


def getTopTerms(explanation):
    outlist = {}
    termlist=explanation['details'][0]['details']
    notFound = 1
    while notFound:
        try:
            if termlist[0]['description'][:6] != "weight":
                termlist = termlist[0]['details']
            else:
                notFound =0
        except:
            notFound = 0
    for term in termlist:
        parsed_term = parseTerm(term)
        outlist[parsed_term] = term['value']
    return outlist

def parseTerm(term): 
    try:
        t= term['description'].split(":")[1].split(" in")[0].strip()
    except:
        t= ""
    if len(t) ==0 and len(term['details'])>1:
        for x in term['details']:
            t.append(parseTerm(x) + " ")
    return t

        

def getAnnotations(src):
    ann_list = []
    try:
        for ann in src.get(ann_field):
            ann_list.append(ann['text'])
    except:
        pass
    return ann_list



if __name__ == '__main__':
    
    es_ann = Elasticsearch(save_search_es)

    dedupeWeighted = dedupe.DeduplicateLSH(lshthresh,lshter,lshshing) 
    dedupeMLT = dedupe.DeduplicateLSH(lshthresh,lshter,lshshing)
    app.run(host = '0.0.0.0', threaded=True)

