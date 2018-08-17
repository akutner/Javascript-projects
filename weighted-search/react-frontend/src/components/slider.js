import React, {Component} from 'react';



//splits query from Search and renders slider
//passes slider values back to Search to be 
//processed into a query
class Slider extends Component {
    onRemove = (e) =>{
        const term = this.props.term;
        this.props.handleRemove(term);
    }

    onBoost = (e) =>{
        //pass list to parent
        const term =  this.props.term;
        this.props.handleBoost(term,parseFloat(e.target.value));

    }
    handleHover = () =>{
        this.props.handleHover(this.props.term);
        
    }
    handleExit = () =>{
        this.props.handleExit(this.props.term);

    }
    sliderNum = () =>{
        if(this.props.score !== Number.MAX_SAFE_INTEGER && this.props.score !== undefined){
            return (parseFloat(this.props.score*this.props.boost)).toFixed(2);
        }else{
            return "";
        }
    }
    render(){//value = this.props.boosts[i]
        return (
            
            <div 
            onClick = {this.handleHover} 
            onDoubleClick ={() => this.props.handleBoost(this.props.term,1)}
            className={"Slider " + this.props.hover}>
            <p className={"Term "}>{this.props.term.replace(/ AND/g,"") + " : "+ this.props.boost.toFixed(2)}</p>
                <div className="SliderButtons">
                <p className = "RemoveSlider Num">{this.sliderNum()}</p>
                <button className ="RemoveSlider" onClick = {this.onRemove}>X</button>
                <button className = "RemoveSlider" onClick ={() =>this.props.handleBoost(this.props.term,1)}>{this.props.button_name}</button>
                </div>
                <input
                    step = {0.01}
                    className = "Slide"
                    type = "range"
                    min = "-2"
                    max = "10"
                    value = {this.props.boost}
                    onChange={(e) => this.onBoost(e)}
                />
            </div>    
        );
    } 
}


export default Slider;
