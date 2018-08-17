
import React, { Component } from 'react';


import TitleViewer from './title-viewer';

class Results extends Component{
    addAll = () =>{
        return this.props.addAll("MLT");
    }
    addAllW= () =>{
        return this.props.addAll("W");
    }

    render(){

        return (
            <div className = "Results">
            <TitleViewer
                title = "Weighted Query Docs"
                possible_docs = {this.props.weighted_docs}
                removeDoc = {this.props.removeDoc}
                addDoc = {this.props.addDoc}
                setHover = {this.props.setHover}
                hover = {this.props.hover}
                addTerm = {this.props.addTerm}
                addAll = {this.addAllW}
            />
            <TitleViewer
                title = "MLT Query Docs" 
                possible_docs = {this.props.mlt_docs}
                removeDoc = {this.props.removeDoc}
                addDoc = {this.props.addDoc}
                setHover = {this.props.setHover}
                hover = {this.props.hover}
                addTerm = {this.props.addTerm}
                addAll = {this.addAll}
            />
            </div>

        );



    }

}







export default Results;

