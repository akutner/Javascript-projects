/*Controller object for entire application
 *Creates MLT and Weighted Queries 
 *from user input into components
 *Passes Query to backend for ES retrieval
 *Displays result
 */


import React, { Component } from 'react';
import jQuery from 'jquery';
import './App.css';

import DocViewer from './components/weighted-viewer'
import TitleViewer from './components/title-viewer'
import Results from './components/results'

//posts the data to the url using jquery.ajax
function postJSON(url, data, success, error) {
    if (typeof data!== 'string'){
        data = JSON.stringify(data);
    }
    jQuery.ajax({
        url:url,
        type:"post",
        data:data,
        contentType: "application/json",
        success: success,
        error: error
    });
}


//stop_words for mlt query
let stop_words = ["a","an","and","are","as","at","be","but","by","for","if","in","into","is","it","no","not","of","on","or","such","that","the","their","then","there","these","they","this","to","was","will","from","with"];


//Fields for mlt query
let fields = ["TcfModel_hasContent", "TcfModel_hasTitle","TcfModel_hasSummary","TcfModel_hasDescription"];//fields to query
let type = "TcfModel_Document";//doc type

let default_start_date =  "2018-01-01T12:00:00.000Z";//start date for query, TODO: add drop down to select date
let default_end_date = "2018-06-01T12:00:01.000Z";//end date for query, TODO: add drop down to select date
let date_format = "yyy-MM-dd'T'HH:mm:ss.SSSZ";//date format (ISO)
let index_code = "AWKSjkvKbm5M-EqJKCVs";//for kibana

//date field
let date_field = "TcfModel_hasPubDate";


let term_floor = 6;//min number of terms labeled
let max_query_terms = 25; //max number of terms for MLT query
let num_results = 20; //number of results displayed from queries
let min_percentage_match = "70%";// min percentage of terms to match 


class App extends Component {


    constructor(props){
        super(props);
        this.state ={
            //Root Document on display
            root_doc :{"doc":{"terms": {},'date':0}},
            marked_docs: [],//docs marked as relevant by user
            possible_docs: {"responses":[]},//docs from mlt query
            query_docs: {"responses":[]},//docs from weighted query
            irr_docs: [],//list of irrelevant doc ids
            term_list : [],//ranked list of key terms
            daterange: [default_start_date, default_end_date],
            weights: {},
            hover: "&",
            show_docs:false,
            annotations : [],
            recs :{},
            cutoff : 1,
            top_val :-1,
            top_wval: -1
        };
        this.refreshWeight({});
    }
    //resets to origional state
    resetRoot = () =>{

        this.setState({
            root_doc :{"doc":{"terms": {}}},
            marked_docs: [],
            possible_docs: {"responses":[]},
            query_docs: {"responses":[]},
            irr_docs: [],//list of irr doc ids
            term_list : [],//ranked list of key terms
            daterange: [default_start_date, default_end_date],
            weights: {},
            hover : "&",
            annotations : [],
            backend_response:{},
            recs :{}
        }, () =>{
            this.refreshWeight({});
        });
    }
    //logs a list of the docs that were selected
    getOutObj = (doc) =>{
        const out_Obj = {};
        try{
            out_Obj['id'] = doc['id'];
            const out_terms = Object.keys(doc['terms']);
            out_Obj['terms'] = out_terms;
            out_Obj['dup'] = doc['dup'];

        }catch(error){
            console.log("invalid doc object");
        }
        return out_Obj;
    }
    //creates and saves an out_doc.json from the annotated results
    createOutDoc = () => {

        const outFile = {};
        const final_root = this.state.root_doc.doc;
        outFile['root'] = this.getOutObj(final_root);

        let docList = [];
        const final_doclist = this.state.marked_docs;
        final_doclist.forEach((doc)=>{
            docList.push(this.getOutObj(doc));
        });
        outFile['docs'] = docList;
        const weights = this.state.weights;
        let out_terms = [];
        for(let term in weights){
            out_terms.push({'term':term,'weight':weights[term]});
        }
        console.log(out_terms);
        outFile['terms'] = out_terms;
        outFile['weighted_query'] = this.makeWeightedQuery(this.state.weights)
        
        let mlt_doc_ids = this.getMarkedIDs();
        outFile['MLT_query'] = this.makeMLTQuery(mlt_doc_ids)
        return outFile;
    }


    //perform MLT query on root & marked docs
    //Update possible_docs with results 
    refreshState = () => {
        this.refreshMLT();
        this.refreshW();
    }
    //requeries from the current state
    refreshW = () =>{
        const w = this.state.weights;
        this.refreshWeight(w);
    }
    //requeries from given weight
    refreshWeight = (weight) =>{
        this.mlWeight(weight);
    }

    //performs and updates MLT
    refreshMLT = () =>{   
        let mlt_doc_ids = this.getMarkedIDs();
        this.mlThese(mlt_doc_ids);
    }

    //adds term to the query with default weight of 1
    addTerm = (new_term) =>{
        let term = Object.keys(new_term)[0];
        let hover = term.toLowerCase();
        let annotations = this.state.annotations;
        let ind = annotations.indexOf(term);
        if(ind !== -1){
            annotations.splice(ind,1);
            this.setState({
                annotations:annotations
            });
        }
        this.setState({
            hover : hover
        });
        console.log(this.state.term_list);
        if(!(term.toLowerCase() in this.state.term_list)){
            this.update(new_term)
        }
    }

    //adds new_terms to termlist
    update = (new_terms) =>{
        let term_list = this.state.term_list;
        let new_weights = this.makeWeights(new_terms);
        new_terms = this.extend(term_list,new_terms);
        this.setState({
            term_list : new_terms,
            weights: new_weights
        }); 
        return new_weights;
        
    }

    //queries backend for origional doc
    getOrig = (doc_id,date=0,size=10) =>{    

        if(date){
            try{
                let d = new Date (Date.parse(date));
                let lt = new Date(d.valueOf()+10);
                date=[d.toISOString(), lt.toISOString()];
            }catch(error){
                try{
                let d = new Date (date);
                let lt = new Date(d.valueOf()+10);
                date=[d.toISOString(), lt.toISOString()];
                }catch(error){}
            }
        }else{
            date=[];
        }
        let docs = [doc_id];
        let query = this.makeMLTQuery(docs, -1, true, true,max_query_terms,date,true,false);
        let in_q = {'query':query, 'id':doc_id};
        return new Promise(function(resolve,reject){
            postJSON('http://127.0.0.1:5000/api/orig',JSON.stringify(in_q),(data)=>{
                resolve(data);
            });
        });
    }

    

    //combines src with obj map
    extend=(obj, src) =>{
        Object.keys(src).forEach(function(key) {    
            if(!(key in Object.keys(obj))){
                obj[key] = src[key]; 
            }
        });
        return obj;
    }

    //gets terms from marked docs and ranks top set
    makeWeights = (term_list) => {
        let weights= this.state.weights;
        for (let term in term_list){
            if(term in this.state.weights){
                weights[term] = this.state.weights[term];
                //if you wanted to boost already existing terms for additions do so here
            }else{
                weights[term]= 1;
            }
        }
        return weights;
    }

    //makes my DO format:
    //{'id': id
    //'title' : title
    //'content': content
    //'terms': top 25 tf-idf terms
    //....
    //}
    makeDO = (doc_id, terms, title, content, date, dup = [],annotations = [],val = -1)=>{
        let myDO = {};
        myDO['id'] = doc_id;
        myDO['terms'] = terms;
        myDO['title'] = title;
        myDO['content'] = content;
        myDO['date'] = date
        myDO['dup'] = dup;
        myDO['val'] = val;
        myDO['annotations'] = annotations;
        return(myDO);
    }

    //checks if an obj is empty
    isEmpty = (obj) =>{
        for(let key in obj) {
            if(obj.hasOwnProperty(key))
                return false;
        }
        return true;
    }

    //makes MoreLikeThis Elastic search query
    makeMLTQuery = (doc_ids, size, include, explain, max_terms=max_query_terms, date=[], no_irr=false,addDups=true)=>{
        let analyzer = {}
        for(let field of fields){
            analyzer[field] = "standard";
        }
        let like = [];
        doc_ids.forEach(function(id){
            let doc = {};
            doc['_type'] = type;
            doc['_id'] = id;
            doc['per_field_analyzer'] = analyzer;
            //doc['analyzer'] = "standard";
            like.push(doc);
        });
        //add dups to query as well
        if(addDups){
            this.getDupIDs().forEach(function(id){
                let doc = {};
                doc['_type'] = type;
                doc['_id'] = id;
                doc['per_field_analyzer'] = analyzer;
                like.push(doc);
            });
        }

        let mlt = {};
        mlt['fields'] = fields;
        mlt['stop_words'] = stop_words;
        mlt['like'] = like;
        if(include){
            mlt['include'] = true;
        }
        mlt['max_query_terms'] = max_terms;
        let must = []
        must.push({"more_like_this":mlt});
        if(date.length===2){
            must.push(this.dateFilter(date[0],date[1]))
        }else{
            must.push(this.dateFilter());
        }
        let query = {}
        query['query']={'bool':{'must':must}};

        if(this.state.irr_docs.length & !no_irr){
            query['query']['bool']['must_not']= {'terms':{'_id':this.state.irr_docs}};

        }
        //query['query']['more_like_this'] = mlt;
        query['explain'] = explain;
        if (size !== -1){
            query['size'] = size; 
        }
        return query;

    }

    //creates date filter
    dateFilter = (gte = this.state.daterange[0], lt = this.state.daterange[1]) =>{
        let range = {};
        range[date_field] =  {
            "gte":gte,
            "lt" :lt,
            "format":date_format
        };

        let date = {"range": range};
        return date;
    }
        
    //writes ES weighted query
    makeWeightedQuery = (weights, size= num_results ) =>{
        let should =[]
        for (let key in weights){
            let q_s = {};
            if(key.split(' ').length >1){
                key = '"'+key+'"';
            }
            q_s["query"] = key.toLowerCase();
            q_s["boost"] = weights[key];
            q_s["fields"] = fields;
            let toAdd= {"query_string":q_s}
            should.push(toAdd);
        }
        let query = {"query":{"bool":{"should":should}}};
        query['query']['bool']['must']=this.dateFilter();
        query['query']['bool']['minimum_should_match']= min_percentage_match;
        if(this.state.irr_docs.length||this.state.marked_docs.length||this.state.root_doc.doc.id){
            let markedIDs = this.getAllIDs();
            let docsToExclude = this.state.irr_docs.concat(markedIDs);
            query['query']['bool']['must_not']= {'terms':{'_id':docsToExclude}};
        }
        query['explain'] = true;
        query['size'] = size;
        return query;
    }

    //gets all ids from marked
    getMarkedIDs = () =>{
        let markedIDs = [];
        this.state.marked_docs.forEach((term) =>{
            markedIDs.push(term.id);
        });
        return markedIDs;
    }
    //gets all marked IDs and their duplicates
    getAllIDs= () =>{
        let allIDs = [];
        this.state.marked_docs.forEach((term) =>{
            allIDs.push(term.id);
            term.dup.forEach((id) =>{
                allIDs.push(id);
            });
        });
        return allIDs;
    }
    //gets all duplicate ids from marked docs
    getDupIDs = () =>{
        let allIDs = [];
        this.state.marked_docs.forEach((term) =>{
            term.dup.forEach((id) =>{
                allIDs.push(id);
            });
        });
        return allIDs;
    }        


    //gets all terms from origional
    getAllTerms = (response) =>{
        let promises = []
        response.forEach((hit) =>{
            //console.log(hit['id']);
            promises.push(this.getOrig(hit["id"],hit['date']));
        });
        return promises;
    }
    parseFreshQueryTerms = (response) =>{
        return Promise.all(this.getAllTerms(response));
    }
    //returns list of 
    mlWeight = (weights) =>{
        //weights is a dict from term to weight
        let query = this.makeWeightedQuery(weights);
        let cut = this.state.cutoff;
        if(cut === 1){
            cut = -1;
        }
        this.backendWeightedQuery(query,'api/cut',weights,cut);
        
    } 
    //performs mlt query on backend and updates state
    backendMLTQuery = (query, api,cur_resp,cutoff = -1) => {
        let q = ""
        if(cutoff===-1){
            api = "api/mlt"
            q = JSON.stringify(query)
        }else{
            q = JSON.stringify({"query":query,"tp":"mlt","cutoff":cutoff})
        }
        console.log(api);
        //if query is blank....
        postJSON('http://127.0.0.1:5000/'+api,q,(data)=>{

            try{
                cur_resp.push(data);
            }catch(error){
                cur_resp = data;
            }
            let ndocs = {"responses" : [cur_resp]};
            console.log(ndocs);
            this.setState({possible_docs:ndocs});
        });
        
    }



    //performs weighted query on backend and updates state
    backendWeightedQuery = (query,api,weights,cutoff = -1) =>{
        let q = "";
        if(cutoff===-1){
            api = "api/weighted"
            q = JSON.stringify(query)
        }else{
            q = JSON.stringify({"query":query,"tp":"weighted","cutoff":cutoff})
        }
        console.log(api);
        postJSON('http://127.0.0.1:5000/'+api,q,(data) =>{
            let ndocs = {"responses" : [data]};
            this.setState({query_docs:ndocs});
            if(Object.keys(weights).length<term_floor){
                return this.parseFreshQueryTerms(data).then((response)=>{
                    let output = [];
                    let ind = 0;
                    response.forEach((hit) =>{
                        let out = data[ind];//parse out annotations as well?
                        let terms = this.extend(out['terms'],hit['terms']);
                        let myDO = this.makeDO(hit['id'],terms,hit['title'],hit['content'],hit['date'],hit['dup'],hit['annotations'],data[ind]['val']);
                        myDO['count'] = data[ind]['count']
                        if(myDO['val']===1){
                            myDO['val']=0;
                        }
                        output.push(myDO);
                        ind++;
                    });             
                    return output;
                }).then((output) =>{
                    this.setState({query_docs:{"responses":[output]}});
                });
            }else{
                return null;
            }
        });
    }    

    //performs mlt query on given docs
    mlThese = (mlt_doc_ids) =>{
        let query = this.makeMLTQuery(mlt_doc_ids, num_results, false, true);
        let cur_resp = this.state.possible_docs;
        let cut = this.state.cutoff;
        if(cut === 1){
            cut = -1;
        }
        console.log(cut);
        this.backendMLTQuery(query,'api/cut',cur_resp,cut);
    }


    //updates root doc to the given DO
    updateRootDoc = (doc) =>{
        this.setState({
            root_doc: {"doc":doc},
            possible_docs: {"responses":[]},
            irr_docs: [],
            annotations:doc['annotations']
        }, () => {
            this.addDoc({"doc":doc});
            //this.refreshState();
        });
    }



    //removes doc and adds to irrelevant doc list
    removeDoc = (doc) =>{
        //add id to irr_docs list
        //remove from poss_docs
        let id = doc.doc['id']; 
        let irr_docs = this.state.irr_docs;
        irr_docs.push(id);
        this.refreshMLT();
        this.refreshW();
        this.setState({
            irr_docs : irr_docs
        });

    }


    //removes the doc from marked and if needed resets root
    removeDocFromMarked = (doc) =>{
        let marked =this.state.marked_docs;
        let ind = marked.indexOf(doc.doc);
        if(ind >=0){
            marked.splice(ind,1)
        }

        if(marked.length === 0){
            this.resetRoot();
        }else{
            if(doc.doc === this.state.root_doc.doc){
                this.updateRootDoc(marked[0]);
            }
            this.setState({
                marked_docs : marked
            });
            this.removeDoc(doc);
        }

    }

    //adds terms from given doc to recomended terms
    addRecs = (doc) =>{
        try{
            let terms = doc.doc.terms;
            let toSet = {}
            for (let term of Object.keys(terms)){
                if(Object.keys(this.state.weights).findIndex(item => term.toLowerCase().replace(/"/g,"") === item.toLowerCase().replace(/"/g,"")) === -1){
                    toSet[term] = terms[term];
                }
            }
            if(!Object.keys(toSet).length){
                this.getOrig(doc.doc.id,doc.doc.date).then((doc)=>{
                    this.addRecs({"doc":doc});
                });  
            }else{
                this.setState({
                    recs:toSet
                });
            }
        }catch(error){}
    }
    
    //adds weights from document to the state's weights
    //doesn't change current weights in state
    addWeights = (doc) => {
        let terms = doc.doc.terms;
        let weights = this.state.weights;
        for (let term in terms){
            //just sets boost as 1
            if(!(term in weights)){
                weights[term] = 1;
            }                   
            //adds to boost if already in doc

        }

        this.setState({
            weights:weights
        });
    }


    //adds doc to query
    //DOES REQUERY
    addDoc = (doc) => {
            if(!this.state.root_doc['doc']['id']){
                this.updateRootDoc(doc.doc);
            }else{
                this.addRecs(doc);
                let marked_docs = this.state.marked_docs;
                if(this.getMarkedIDs(marked_docs).indexOf(doc.doc.id)===-1){
                    marked_docs.unshift(doc.doc);
                    this.setState({    
                        marked_docs: marked_docs
                    });
                }
                try{
                    this.refreshState();
                }catch(error){
                    console.log(error);
                }
            }
    }
    addAll = (str) =>{
        let ls = [];
        if(str==="MLT"){
            ls = this.state.possible_docs.responses[0];
        }else{
            ls = this.state.query_docs.responses[0];
        }
        let marked_docs = this.state.marked_docs;
        let root = true
        try{
            for(let doc of ls){
                console.log(doc)
                if(root && !this.state.root_doc['doc']['id']){
                    this.addRecs(doc);
                    this.updateRootDoc(doc);
                    root = false;
                }else{
                    if(this.getMarkedIDs(marked_docs).indexOf(doc.id)===-1){
                        marked_docs.unshift(doc);
                    }
                }
            }
        }catch(error){}

        try{
            this.setState({    
                marked_docs: marked_docs
            });
            this.refreshState();
        }catch(error){
            console.log(error);
        }
        
    }

    //type is an int for index
    //update state for new date restriction
    //SHOULD refresh state
    setDate = (date, type) =>{
        let ls = this.state.daterange;
        let ndate = new Date(date);
        ls[type] = ndate.toISOString();
        this.setState({
            daterange : ls,
        });
        this.refreshState();

    }



    //sets term weight to given amount
    //DOESN'T REQUERY
    //(because it boosts on any update to the slider)
    //(caused a lot of backup on backend)
    handleBoost = (term, amt) =>{
        let weights = this.state.weights;
        
        if (Object.keys(weights).indexOf(term) !== -1){
            weights[term] = amt;
            this.setState({
                weights: weights
            });
        }else{
            let recs = this.state.recs;
            let toAdd = {};
            toAdd[term] = recs[term];
            this.addTerm(toAdd)
            delete recs[term]
            this.setState({
                recs:recs
            });
            this.handleBoost(term,amt);
        }
        

    }

    //removes term from query
    //should I add "removed terms" state? to prevent readding on adding doc
    handleRemove = (term) =>{
        let terms = this.state.term_list;
        let weights = this.state.weights;
        delete weights[term];
        delete terms[term];
        this.setState({
            weights:weights,
            term_list:terms,
        });
    }
    //Handles removing term from recomended terms
    handleRecRemove = (term) =>{
        let rec = this.state.recs;
        delete rec[term];
        this.setState({
            recs:rec
        });
    }

    //gets the link for kibana button
    getKibanaLink = () =>{
        let ids= this.getAllIDs().join("%20OR%20");
        let link = "http://efreeti.lab.rii.io:5601/app/kibana#/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now%2Fy,mode:quick,to:now))&_a=(columns:!(_source),index:"+index_code+",interval:auto,query:(query_string:(query:'_id:("+ids+")')),sort:!("+date_field+",desc))"
        return link;
    }

    //resets the terms to the state's weights
    resetTerms = () =>{
        let weights = this.state.weights;
        for (let term in weights){
            weights[term] = 1;
        }
        this.setState({
            weights:weights
        }, () =>{
            this.refreshState();
        });
    }


    //sets selected highlight term
    setHover = (term) =>{
        const hover = this.state.hover;
        if(term !== hover){
            this.setState({
                hover:term
            });
        }else{
            this.setState({
                hover:"&"//regex gets rid of this
            });
        }
    }
    
    //removes the selected highlighting and resets it to blank
    removeHover = (term) =>{
        const hover = this.state.hover;
        if(term === hover){
            this.setState({
                hover: "&"//regex gets rid of this
            });
        }
    }

    //toggles showing marked docs pane
    toggleDocs = () =>{
        this.setState({
            show_docs: !this.state.show_docs
        });
    }
    
    //updates search ID based on if there are any marked docs
    updateSearchID = (newID) =>{
        if (this.state.marked_docs.length ===0 & Object.keys(this.state.weights).length === 0){
            this.getSearchID(newID);
        }else{
            this.setSearchID(newID);
        }
    }
    //gets search do from backend and sets state to search

    getSearchID = (newID) =>{
        console.log("api/get");
        postJSON('http://127.0.0.1:5000/api/get',JSON.stringify({"id":newID}),(data)=>{
            let src = data['_source'];               
            let ls = [];

            //append dups to irrdocs
            //terms and weights???
            src['docs'].forEach((d)=>{
                this.getOrig(d['id']).then((doc) =>{
                    doc['dup']= d['dup'];
                    return doc;
                }).then((doc) =>{ 
                    ls.push({"doc":doc});
                    return ls;
                }).then((ls) =>{
                    if(ls.length===src.docs.length){
                        for(let doc of ls){
                            if(!this.state.root_doc['doc']['id']){
                                this.addRecs(doc);
                                this.updateRootDoc(doc.doc);
                            }else{
                                let marked_docs = this.state.marked_docs;
                                if(this.getMarkedIDs(marked_docs).indexOf(doc.doc.id)===-1){
                                    marked_docs.unshift(doc.doc);
                                    this.setState({    
                                        marked_docs: marked_docs
                                    });
                                }
                            }
                        }

                        try{
                            this.refreshState();
                        }catch(error){
                            console.log(error);
                        }

                    }
                });
                  

            });
            src['terms'].forEach((term)=>{
                this.handleBoost(term['term'],term['weight']);
            });
            this.refreshState();//queries with loaded info
        });
    }


    //on startup look for /<id> at end of url
    componentWillMount(){
        try{
            let id = window.location.href.split('/')[3];
            if(id.length){
                this.getSearchID(id);
            }
        }catch(error){
        }
    }

    
    //sets the search ID to the given ID and saves state
    setSearchID = (newID) =>{
        let search_do = this.createOutDoc();
        search_do['id'] =newID
        postJSON('http://127.0.0.1:5000/api/save',JSON.stringify(search_do),(data)=>{
            console.log("Saved to : "+newID);        
        });
    }
    //gets annotation list DOM obj
    getAnnotations = () =>{
        const annotations = new Set(this.state.annotations);//dedup
        const weight_set = new Set(Object.keys(this.state.weights));
        const annotation_list = [...annotations].filter(x => !weight_set.has(x.toLowerCase()));
        return annotation_list.map(annotation =>{
            return(<li>{annotation}<button onClick = {this.addTerm(annotation)}>Add Term to Query</button></li>);
        });
        
    }

    //more like this piece of text
    mlText = (text,max_terms=25) => {
        let like = [];
        /*doc_ids.forEach(function(id){
            let doc = {}
            doc['_type'] = type;
            doc['_id'] = id;
            like.push(doc);
        });*/
        //add dups to query as well
        like = text
        let mlt = {};
        mlt['fields'] = fields;
        mlt['stop_words'] = stop_words;
        mlt['like'] = like;
        mlt['max_query_terms'] = max_terms;
        mlt['min_term_freq'] = 1;
        let must = []
        must.push({"more_like_this":mlt});
        must.push(this.dateFilter());
        let query = {}
        query['query']={'bool':{'must':must}};
        query['explain'] = 1;
        query['size'] = 1;
        return query;

    }
    //querries selected term
    querySelected = () =>{
        let text = window.getSelection().toString();
        let query = this.mlText(text)
        postJSON('http://127.0.0.1:5000/api/mlt',JSON.stringify(query),(data)=>{
            let doc = data[0]
            this.addRecs({"doc":doc});
        })
    }
    //add the highlighted as a term
    addSelected = () =>{
        let text = window.getSelection().toString();
        if(text !== ""){
            let toAdd = {}
            toAdd[text] = Number.MAX_SAFE_INTEGER;
            this.addTerm(toAdd);
        }
    }
    
    setCutoff = (cutoff) =>{
        this.setState({
            cutoff:cutoff
        },()=>{
        this.refreshState();
        });
    }
    generateHistogram = () =>{
        postJSON('http://127.0.0.1:5000/api/hist_samp',JSON.stringify(this.makeMLTQuery(this.getMarkedIDs(),-1,true,true)),(data)=>{});
    }
    render() {
    return (
      <div className="App" onContextMenu = {this.querySelected}>
        <DocViewer
            name = "Root"
            doc_obj = {this.state.root_doc}
            terms = {this.state.term_list}
            endDoc = {this.createOutDoc}
            weights = {this.state.weights}
            handleBoost = {this.handleBoost}
            handleRemove = {this.handleRemove}
            setHover = {this.setHover}
            hover = {this.state.hover}
            term_list = {this.state.term_list}
            num_docs = {(this.state.marked_docs.length)}
            setDate = {this.setDate}
            daterange = {this.state.daterange}
            update = {this.addTerm}
            updateRootID = {this.updateSearchID}
            toggleDocs = {this.toggleDocs}
            show_docs = {this.state.show_docs}
            resetRoot = {this.resetRoot}
            resetTerms = {this.resetTerms}
            annotations = {this.state.annotations}
            refresh = {this.refreshW}
            recs = {this.state.recs}
            handleRecRemove = {this.handleRecRemove}
            querySelected = {this.querySelected}
            addSelected = {this.addSelected}
            setCutoff = {this.setCutoff}
            cutoff = {this.state.cutoff}
            generateHistogram = {this.generateHistogram}
            kiblink = {this.getKibanaLink}
        />
        <Results
            weighted_docs = {this.state.query_docs["responses"]}
            mlt_docs = {this.state.possible_docs["responses"]}
            removeDoc = {this.removeDoc}
            addDoc = {this.addDoc}
            hover = {this.state.hover}
            setHover = {this.setHover}
            addTerm = {this.addTerm}
            addAll = {this.addAll}
        />


        {this.state.show_docs ? 
            <TitleViewer
                possible_docs = {[this.state.marked_docs]}
                title = "Marked Docs"
                removeDoc = {this.removeDocFromMarked}
                addDoc = {this.addDoc}
                setHover = {this.setHover}
                hover = {this.state.hover}
                show_modified = {true}
                setDate = {this.setDate}
                daterange = {this.state.daterange}
                update = {this.update}
                updateRootID = {this.updateSearchID}
                toggleDocs = {this.toggleDocs}
                show_docs = {this.state.show_docs}
                resetRoot = {this.resetRoot}
                resetTerms = {this.resetTerms}
                addTerm = {this.addTerm}
                setRoot = {this.updateRootDoc}
            />    
            : 
            null
        }
      </div>
    );
  }
}

export default App;
