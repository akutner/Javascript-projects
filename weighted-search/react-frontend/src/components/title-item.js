import React, {Component} from 'react'


class TitleItem extends Component{
    
    constructor(props){
        super(props);
        this.state ={
            show_more : false
        };
    }
    handleSelect = (e) =>{
        var showM = !this.state.show_more;
        this.setState({
            show_more : showM
        });
    }
    handleRemove = (e) =>{
        this.props.remove(this.props.d);
    }
    handleAdd = (e) =>{
        this.props.add(this.props.d);
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

        return output.slice(0,4);

    }
    handleHover = (term) =>{
        //console.log(term);
        this.props.handleHover(term);
    }
    handleAddTerm = (term) =>{
        var weight = Number.MAX_SAFE_INTEGER;
        if(Object.keys(this.props.d.doc['terms']).indexOf(term)!== -1){
            weight = this.props.d.doc['terms'][term]
        }
        var to_add = {}
        to_add[term] = weight;
        this.props.handleAdd(to_add);
    }
    getTerms = () =>{
        var disp = <p></p>;
        try{
           
            disp = this.sortByValue(this.props.terms).map(term =>{
                term = term.replace(/[.,/#!$%^&*"'“;‘:{’}=\-”_`~()]/g,"");
                var isKey = "normal";
                var score = "";
                if(term === this.props.hover){
                    isKey = "hover";
                    score = this.props.d.doc['terms'][term]
                }
                return(
                    <li className ={isKey} 
                    key = {term}
                    onClick = {()=>{this.handleHover(term)}}
                    onDoubleClick = {() => {this.handleAddTerm(term)}}
                    ><div className="TermList">{term}</div><div className = "Score">{score}</div></li>
                );
            });
            return disp;
        }catch(error){
            console.log(error);
        }
    }
    annotate = (text) =>{
        var new_text = "";
        try{
            var by_word = text.split(' '); //insert regex
            var terms = Object.keys(this.props.d.doc['terms']);
        
            new_text = by_word.map((word,value) =>{
                var isKey = "normal";
                var s_word = word.toLowerCase().replace(/[.,/#!$%^&*"'“;‘:{’}=\-”_`~()]/g,"").replace(/\s+/g, ""); 
                let op = 0;
                let sty = {"backgroundColor" : "rgba(255,165,0,0)"}
                if (terms.indexOf(s_word)>=0){
                    isKey = "key";
                    op= this.props.d.doc['terms'][s_word];
                    let max = Object.values(this.props.d.doc.terms).reduce(function(a,b) {return Math.max(a,b)});
                    sty = {"backgroundColor": "rgba(255,165,0,"+(.3+.7*(op/max))+")"}
                }
                if(s_word === this.props.hover){
                    isKey = "hover";
                    sty = {}
                }
                return (
                    <span key = {word+this.props.id+value}
                    onClick = {()=>{this.handleHover(s_word)}}
                    
                    onDoubleClick = {() => {this.handleAddTerm(s_word)}}
                    className={isKey+ " " + s_word} style = {sty}> {word} </span>
                );
                
            });
            return new_text;

        }catch(error){
            console.log(error);
        }
    }
    handleSet= () =>{
        this.props.setRoot(this.props.d.doc);
    }
    showDups = ()=>{
        console.log(this.props.d.doc.dup)

    }
    numDups = () =>{
        try{
            return this.props.d.doc.dup.length;
        }catch(error){
            return "0";
        }
    }
    render(){
        let opacity = this.props.d.doc.val/this.props.max_val;
        if(!this.props.max_val | this.props.max_val === 1){
            opacity=0;
        }
        let op = {
            "backgroundColor":"rgba(0,180,0,"+opacity+")"
    };
        //let op = (this.props.d.doc.val)/100
        return(
            <div className ="ListItem"  key = {this.props.d.doc.id}>
            
                <li key = {this.props.d.doc.id}>
                    <h3>{this.annotate(this.props.title)}<span className = "numDups" onClick={this.showDups}>{this.numDups()}</span></h3>

                    <p>{new Date(this.props.date).toISOString()}</p>
                    {this.props.d.doc.val !== -1 ?
                        <p className = "val" style = {op}>{this.props.d.doc.val}</p>:

                        null
                    }
                    <p>Key Terms:</p>
                    <ul> {this.getTerms()}</ul>
                    <button className ="Select Doc" onClick= {this.handleSelect}>{this.state.show_more ? "Hide": "Show"} Content</button>
                    <button className ="Remove Doc" onClick= {this.handleRemove}>Remove</button>
                    {this.props.show_add ?
                    <button className ="Add Doc" onClick = {this.handleAdd}>Add</button>
                        :
                    <button className = "Set Doc" onClick = {this.handleSet}>Set As Root</button>
                    }
                    {this.state.show_more ?
                    <p>{this.annotate(this.props.d.doc.content)}</p>
                    :null}
                </li>

            </div>



        );
    }
}





export default TitleItem
