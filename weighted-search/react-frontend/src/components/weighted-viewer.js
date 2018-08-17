import React, {Component} from 'react';
import Slider from './slider';
import ModifyQuery from './modify-query';


class DocViewer extends Component{
    

    constructor(props){
        super(props);
        this.state = {
            show_annotations : false
        }
    }

    handleAddTerm = (term) =>{
        this.addAnnotation(term);
    }


    addAnnotation(annotation) {
        var new_term = {}
        try{
        if(Object.keys(this.props.rec).indexOf(annotation) !== -1){
            new_term[annotation] = this.props.rec[annotation];
        }}catch(error){
            new_term[annotation] = Number.MAX_SAFE_INTEGER;
        }
        this.props.update(new_term);
    }
     getAnnotations = () =>{
        const annotations = new Set(this.props.annotations);//dedup
        const weight_set = new Set(Object.keys(this.props.weights));
        const annotation_list = [...annotations].filter(x => !weight_set.has(x.toLowerCase()));
        return annotation_list.map(annotation =>{
            var isKey = "";
            if (annotation === this.props.hover){
                isKey = "hover";
            }
            return(<li className = {isKey} onClick = {()=> this.handleHover(annotation)}>{annotation}<button className = {"RemoveSlider"} onClick = {() =>this.addAnnotation(annotation)}>Add Term to Query</button></li>);
        });

    }
    annotate = (text) =>{
        var new_text = "";
        try{
            var by_word = text.split(' '); //insert regex
            var terms = Object.keys(this.props.terms);
            terms= terms.concat(Object.keys(this.props.recs));
            new_text = by_word.map(word =>{
                var isKey = "normal";
                let op =0;
                let sty = {"backgroundColor":"rgba(255,165,0,0)"}
                var s_word = word.toLowerCase().replace(/[.,/#!$%^&*"';“‘:{’}=\-_`~(”)]/g,"").replace(/\s+/g, ""); 
                if (terms.indexOf(s_word)>=0){
                    isKey = "key";
                    if(Object.keys(this.props.recs).indexOf(s_word)>=0){
                        op = this.props.recs[s_word];
                    }else{
                        op = this.props.terms[s_word];
                    }
                    let max = Object.values(this.props.terms).concat(Object.values(this.props.recs))
                    max = max.reduce(function(a, b) {return Math.max(a, b);});
                    sty = {"backgroundColor":"rgba(255,165,0,"+(.3 +.7*(op/max))+")"}
                }
                if (s_word === this.props.hover){
                    isKey = "hover";
                    sty = {}
                }
                return (
                    <span 
                    onClick = {()=> this.handleHover(s_word)}
                    onDoubleClick = {() => this.handleAddTerm(s_word)}
                    className={isKey + " " + s_word} style = {sty}> {word} </span>
                );
            });
            return new_text;
        }catch(error){
        }
    }

    sortByValue = (dict) => {
        var sortable = [];
        for (var term in dict) {
            sortable.push([term, dict[term]]);
        }

        sortable.sort(function(a, b) {
            return b[1] - a[1];
        });
        var output = []
        sortable.forEach((term)=>{
            output.push(term[0]);
        });
        //Object.keys(this.props.terms))
        //return output.slice(0,7);
        return output;
    }
    handleBoost = (term, amt) =>{
        this.props.handleBoost(term,amt);
    }

    handleHover = (term) =>{
        this.props.setHover(term);

    }
    handleExit =(term)=>{
        this.props.removeHover(term);
    }
    handleRecRemove = (term) =>{
        this.props.handleRecRemove(term);
    }
    getTerms = () =>{
        var disp = <p></p>;
        try{
            disp = this.sortByValue(this.props.terms).map(term =>{
                var hover = "";
                if(term===this.props.hover){
                    hover = "hover";
                }
                return(
                    <Slider term = {term}
                    boost = {this.props.weights[term]}
                    score = {this.props.term_list[term]}
                    handleBoost = {this.handleBoost}
                    handleRemove = {this.props.handleRemove}
                    handleHover = {this.handleHover}
                    handleExit = {this.handleExit}
                    hover = {hover}
                    num_docs = {this.props.num_docs}
                    button_name = {"Reset Boost"}
                    />
                );
            });
            return disp;
        }catch(error){
            console.log(error);
        }
    }
    
    getRecs = () =>{

        var disp = <p></p>;
        try{
            disp = this.sortByValue(this.props.recs).map(term =>{
                var hover = "";
                if(term===this.props.hover){
                    hover = "hover";
                }
                return(
                    <Slider term = {term}
                    boost = {1}
                    score = {this.props.recs[term]}
                    handleBoost = {this.handleBoost}
                    handleRemove = {this.handleRecRemove}
                    handleHover = {this.handleHover}
                    handleExit = {this.handleExit}
                    hover = {hover}
                    num_docs = {this.props.num_docs}
                    button_name = {"Add Term"}
                    />
                );
            });
            return disp;
        }catch(error){
            console.log(error);
        }
    }




 
    handleRemove = () =>{
        this.props.removeDoc(this.props.doc_obj);
        
    }
    handleAdd = () =>{
        this.props.addDoc(this.props.doc_obj);
    }
    handleEnd = () =>{
        this.props.endDoc();
    }


    getWScore = () =>{
        let sum = 0
        for(let term of Object.keys(this.props.weights)){
            if(this.props.terms[term]!==Number.MAX_SAFE_INTEGER){
                sum += this.props.weights[term] * this.props.terms[term];
            }
        }
        return sum.toFixed(2);
    }
    getMLTScore = () =>{
        let sum = Object.values(this.props.recs).reduce((a,b)=>a+b,0);
        for(let term of Object.keys(this.props.terms)){
            if(this.props.terms[term]!==Number.MAX_SAFE_INTEGER){
                sum +=  this.props.terms[term];
            }
        }
        return sum.toFixed(2);
    }

    render(){
        var annotations = this.getAnnotations();
        var buttons = <div></div>;
        if(this.props.selectable){
            buttons = ["a"].map(a => {
                return(
                    <div key = "handle event">
                <button key = "remove" onClick={this.handleRemove}>Remove</button>
                <button key = "add" onClick = {this.handleAdd}>Add</button>
                </div>)});
        }
    return(
        <div className={`Viewer Doc ${this.props.name}`}>
            <div className = "Header">
            <h2>{this.props.name} Query Viewer</h2> <button className = "Kibana AddAll" onClick = {() => window.open(this.kiblink(),"_blank")}>Kibana</button></div>
            <div className = "Content" >

            {buttons}
            <ModifyQuery
                setDate = {this.props.setDate}
                daterange = {this.props.daterange}
                update = {this.props.update}
                updateRootID = {this.props.updateRootID}
                toggleDocs = {this.props.toggleDocs}
                show_docs = {this.props.show_docs}
                resetRoot = {this.props.resetRoot}
                resetTerms = {this.props.resetTerms}
            />
        <div className="QueryModifier">
        <button onClick = {this.props.querySelected}>Query Selected Text</button>
        <button onClick = {this.props.addSelected}>Add Selected as Term</button>
        </div>
        <br/>
            <h3>{this.annotate(this.props.doc_obj.doc["title"])}</h3>
            {this.props.doc_obj.doc['date'] ?

                <p>{new Date(this.props.doc_obj.doc['date']).toISOString()}</p>
                :
                null
            }
        {parseInt(this.getMLTScore(),10)!==0?
        <div>
        <p>MLT Score: {this.getMLTScore()}</p>
        <div className = {"Slider"}>
        <p className = {"Term"}>Cutoff</p>
        <input
            step = {0.01}
            className = "Slide"
            type = "range"
            min = "0"
            max = "1"
            value = {this.props.cutoff}
            onChange = {(e) => {this.props.setCutoff(e.target.value)}}></input>
            <p className = "RemoveSlider Num">{this.props.cutoff}</p>
        </div>
        <button onClick = {() =>this.props.generateHistogram()}>Generate Histogram</button>
                </div>
                :null}
        {this.props.annotations.length ?<div>
       <button onClick= {() =>{this.setState({show_annotations : !this.state.show_annotations})}}>{this.state.show_annotations ? "Hide " : "Show "}Annotations</button>
            {this.state.show_annotations ?
                <ul>{annotations}</ul>:
                null
            }</div>:null
        }
            {Object.keys(this.props.terms).length ? 
                <div>
                    <h4>Weighted Query Terms:</h4>
                    <button onClick={this.props.refresh} style = {{float:"right"}}>Query</button>
                <br/>
                    <p>Weighted Score: {this.getWScore()}</p> 
                </div>:
                null
            }
            <ul>{this.getTerms(this.props.doc_obj.doc["terms"])}</ul>
            {this.getRecs().length?
            <div>
            <h4>Recomended Terms </h4><br/>
            <ul>{this.getRecs()}</ul></div>:null}
            {this.props.doc_obj.doc["content"] ?
                <h4>Content:</h4> :
                null
            }
            <br/>
            <p>{this.annotate(this.props.doc_obj.doc["content"])}</p>
            </div>
        </div>
    );
    }

}



export default DocViewer;

