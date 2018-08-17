
import React, {Component} from 'react';

import TitleElement from './title-item';
import ModifyQuery from './modify-query';
class TitleViewer extends Component{



    handleRemove =(doc) =>{
        this.props.removeDoc(doc);
    }
    handleAdd = (doc) =>{
        this.props.addDoc(doc);
    }
    countAbove = () =>{
        try{
            if(this.props.possible_docs[0][0].count){

                return "Documents above cutoff: "+this.props.possible_docs[0][0].count
            }else{
                return ""
            }
        }catch(error){return ""}
    }
    render(){
        var disp = <p></p>;
        
        try{
            const docs = this.props.possible_docs;

            
            const ds = docs[0];
            disp = ds.map(d => {
                return(
                    <TitleElement
                        key = {d.id}
                        d = {{"doc":d}}
                        title = {d.title}
                        terms = {d.terms}
                        date = {d.date}
                        id = {d.id}
                        remove = {this.handleRemove}
                        add = {this.handleAdd}
                        handleAdd = {this.props.addTerm}
                        handleHover = {this.props.setHover}
                        hover = {this.props.hover}
                        show_add = {!this.props.show_modified}
                        removeMarked= {this.props.removeMarked}
                        setRoot = {this.props.setRoot}
                        max_val = {ds[0].val}
                    />);
            });
        }catch(error){
            console.log();
        }
   
        

        return(
            <div className = {"Viewer List "+this.props.title}>
                <div className="Header"><h2>{this.props.title}</h2>
                {!this.props.show_modified ?
                    <button className = "AddAll" onClick = {this.props.addAll}>Add All</button>
                    
                    :null
                }
                </div>
                
                <div className="Content Results">
                
                {this.props.show_modified ?
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
                    :null}
                <p>{this.countAbove()}</p>
                <ul className="DocList">{disp}</ul></div>
            </div>
        );
    }
}


export default TitleViewer;
