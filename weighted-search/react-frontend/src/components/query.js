import React, { Component } from 'react'


class Query extends Component{



    submitQuery = (e) =>{
        if(e.keyCode ===13) {
            e.preventDefault();
            var new_terms ={};
            new_terms[this.queryEntry.value] = Number.MAX_SAFE_INTEGER;
            this.props.update(new_terms);
            this.queryEntry.value="";
        }
    }

    submitRootID = (e) =>{
        if(e.keyCode === 13) {
            e.preventDefault();
            this.props.updateRootID(this.rootIDSearch.value);
            this.rootIDSearch.value = "";
        }
    }

    render() {

        return(
            <div className = "Query">
                <input 
                    className = "Weighted Query"
                    placeholder = "Enter query term"
                    ref = {input => this.queryEntry = input}
                    onKeyDown = {this.submitQuery}
                />
                <input 
                    className = "Root Query"
                    placeholder = "Enter Search ID..."
                    ref = {input => this.rootIDSearch = input}
                    onKeyDown = {this.submitRootID}
                />
                <br/>
            </div>

        );
    }





}


export default Query;
