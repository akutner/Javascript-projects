

import React, { Component } from 'react';
import DateSetter from './date-setter';
import Query from './query';

class ModifyQuery extends Component{

    render () {
    return(
        <div className="QueryModifier">
        <DateSetter
            setDate = {this.props.setDate}
            daterange = {this.props.daterange}
        />
        <Query
            update = {this.props.update}
            updateRootID = {this.props.updateRootID}
        />
        <button
            onClick = {this.props.toggleDocs}>
            {this.props.show_docs ? "Hide" : "Show"} Doc List
        </button>
        <button
            onClick ={this.props.resetRoot}>
            Reset Query
        </button>
        <button
            onClick = {this.props.resetTerms}>
            Reset Term Weights
        </button>
        </div>
    );





    }



}



export default ModifyQuery;
