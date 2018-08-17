/*Date selector component
 *Displays current date selected
 *Input field on "Enter" passes new value up
 */
import React, {Component} from 'react';


class DateSelector extends Component{    
    //pass date and the selector  back up on enter key
    //0 for start
    //1 for end
    handleSelect = (e) =>{

        if(e.keyCode===13){//if enter key
            e.preventDefault();
            var type = 1;
            if(this.props.selector === "Start Date"){
                type = 0;
            }
            //1 or 0?
            this.props.setDate(this.select.value, type);
            this.select.value = ""; 
        }
    }

    render(){
        return(
            <div className = "DateSelector">
            <span>{this.props.selector} :</span>
            <p className="Date Display">{this.props.date}</p>
            <br/>
            <div>
                <input
                    className = {this.props.selector}
                    placeholder = {this.props.selector}
                    onKeyDown = {this.handleSelect}
                    ref ={input => this.select =input}
                />
            </div>
            </div>
        );

    }

}


export default DateSelector;


