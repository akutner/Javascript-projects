

function popup(label){
    event.stopPropagation();
    var pop = document.getElementById(label+" popup");
    pop.classList.toggle("show");
}



/*
function editAnnotation(i){
    event.stopPropagation();
    var pop = document.getElementById(i+" in");
    pop.addEventListener("keyup", function(event) {
        event.preventDefault();
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            setNewValue(i,pop.value);
            pop.value = "";
        }
    });
    pop.classList.toggle("show");

}
function setNewValue(i,val){
    //send to backend

    annotations[i]['label']=val;
    refresh();
    var pop = document.getElementById(i+" popup");
    pop.classList.toggle("show");
//set change to to visible
}
*/

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
function entity_start(label, color_mappings){
    var font_size = parseInt(window.getComputedStyle(document.getElementById("style")).fontSize);
    var overlap = "";


    if(label.s){
        overlap="start";
    }

    if(label.overflow){
        overlap = "end";
    }

    var color = "";
    var rgb = hexToRgb(color_mappings[label['label']]);
    var rgbt = hexToRgb(color_mappings[label['type']]);

    if(Object.keys(color_mappings).indexOf(label['label'])!==-1){
        color = "border-color: "+color_mappings[label['label']]+';'+"background-color: rgba("+rgb.r+","+rgb.g+","+rgb.b+","+label['val']+"); ";
    }else{
        color = "border-color: "+color_mappings[label['type']]+";"+"background-color: rgba("+rgbt.r+","+rgbt.g+","+rgbt.b+","+label['val']+"); ";
    }

    let l = label['label'];
    if(!l){
        l=label['type'].replace(/\./g,"");
        label['label'] = l;
    }
    const i = label['id'];

    //console.log(l)
    //line height = text size + 2* padding + padding
    return '<span '+ 'id = '+l+' style = "'
        +color+
        'padding: ' + 4*label.depth+ 'px 2px; '+
        'line-height: '+(font_size+2*4*label.depth+15)+ 'px;"'+
        ' class="popup ' + l +
        " " +overlap+'" '+
        //' ondblclick = "editAnnotation('+i+')" '+
        'onclick= "popup('+i+')"'+
        '>' ;
}


function entity_end(label){
    var id = label['id'] + ' popup';
    var input_id = label['id'] + ' in';
    let l = label['label'];
    if(!l){
        l= label['type'];
    }
    if(label['format']){
        l=label['format']
        console.log(label['format']);
    }


    return '<span class="popuptext" id="'+id+'">'+'<input class="popuptext in" id="'+input_id+'">'+l+'</span></span>';
}
function getDepths(text, ann_offsets,ann_list){
    var out_text = "";
    var ann_id_stack = [];
    var cur_start = 0;
    var ind = 0;
    for (const off of ann_offsets) {
        var cur_text = text.substring(cur_start, off.loc);
        cur_start = off.loc;
        if (off.type === "start") {
            var cur_label = ann_list[off.id].label;
            ann_list[off.id].depth=1;
            if (ann_id_stack.length > 0) {
                // overlap
                ann_id_stack.push(off.id);

                for (var ind in ann_id_stack){
                    var i = ann_id_stack[ind];
                    if(ann_list[i]["depth"] < ann_id_stack.length-ind){
                        ann_list[i]["depth"] = ann_id_stack.length-ind;
                    }

                }

            } else {
                ann_id_stack.push(off.id);
                out_text += cur_text + entity_start(ann_list[off.id],color_mappings);
            }
        } else if (off.type === "end") {
            if (ann_id_stack.length === 0) {
                // error
            } else if (ann_id_stack[ann_id_stack.length-1] !== off.id) {
                // overlap?
                var secondary_stack = [];
                while (ann_id_stack[ann_id_stack.length-1] !== off.id&&ann_id_stack.length){
                    var insert =ann_id_stack.pop();
                    secondary_stack.push(insert);
                }


                ann_id_stack.pop();
                while (secondary_stack.length){
                    var insert = secondary_stack.pop();
                    ann_id_stack.push(insert);
                    var to_start = ann_list[insert];
                    if(!(off.loc===to_start.end)){//if the end is not the same as the current end
                        ann_list[insert]['s'] = true;//the span is getting overlapped
                    }
                }


            } else {
                ann_id_stack.pop();

            }
        }
        ind++;
    }
    out_text += text.substring(cur_start);
    return ann_list;
}






//annotates the text field with the annotations from anno_list and leaving out the ones labeled with irr_types
//
//anno list:
//  a map with the annotation's start, end and label
//irr_types:
//  list of types to not include in the final render
//text:
//  text to annotate
//color_mappings:
//  mappings of labels to colors
function annotateText(text, anno_list, irr_types, color_mappings,val_field=0) {
    // ann_list is a list of objects with 'start' and 'end' properties
    // giving character offsets into 'text', and a 'label' property

    // separate annotations into start and end
    var ann_list = [];
    for(var ann of anno_list){ 
        if(!ann['label']){
            ann['label'] = ann['$type'];
        }
        let v = 0;
        if(val_field){
            let fields = val_field.split('.');
            try{
                v=ann;
                for(field in fields){
                    v= v[fields[field]];
                    //console.log(v);
                }
            }catch(error){
                v=0;
                //console.log(error);
            }
            
        }
        if(irr_types.indexOf(ann['label']) === -1 ){
            //console.log(irr_types)
            //console.log(ann);
            ann_list.push({type:ann.$type,label:ann.label,start:ann.start,end:ann.end,id:ann.id,val:v,format:ann.format});
        }
    }
    //console.log(ann_list)
    var ann_offsets = Array.from(ann_list.entries()).map(item => {
        var ann_idx = item[0];
        var ann = item[1];
        return [
            {
                loc: ann.start,
                type: "start",
                id: ann_idx,
                len : ann.end-ann.start
            },
            {
                loc: ann.end,
                type: "end",
                id: ann_idx,
                len : ann.end-ann.start
            }
        ];
    });
    // array of arrays to flattened array
    ann_offsets = [].concat.apply([], ann_offsets);
    // sort by loc, then by end before start
    ann_offsets.sort(function(a, b) {
        var val = a.loc - b.loc;
        if (val === 0) {
            var typecomp = (a.type.localeCompare(b.type));
            if (typecomp) {//start comes after an end'
                return typecomp;
            }else if(a.type === "start"){//both types are start
                return b.len-a.len;//order by length for nested items
            }else{
                return a.len-b.len;
            }
        }
        return val;
    });
    var out_text = "";
    var ann_id_stack = [];
    var cur_start = 0;
    ann_list = getDepths(text,ann_offsets,ann_list);

    var ann_offsets = Array.from(ann_list.entries()).map(item => {
        var ann_idx = item[0];
        var ann = item[1];
        return [
            {
                loc: ann.start,
                type: "start",
                id: ann_idx,
                depth: ann.depth,

            },
            {
                loc: ann.end,
                type: "end",
                id: ann_idx,
                depth: ann.depth,
            }
        ];
    });
    ann_offsets = [].concat.apply([], ann_offsets);
    ann_offsets.sort(function(a, b) {
        var val = a.loc - b.loc;
        if (val === 0) {

            var typecomp = (a.type.localeCompare(b.type));
            if (typecomp) {//start comes after an end'
                return typecomp;
            } else if (a.type === "start"){//add depth (lower depth = earlier)
                return b.depth-a.depth;
            }else{
                return a.depth-b.depth;
            }
        }
        return val;
    });
    var ind =0;

    for (var ind; ind<ann_offsets.length; ind++) {
        var off = ann_offsets[ind]
        var cur_text = text.substring(cur_start, off.loc);
        cur_start = off.loc;
        if (off.type === "start") {
            var cur_label = ann_list[off.id];
            if (ann_id_stack.length > 0) {//overlap start
                ann_id_stack.push(off.id);
                out_text += cur_text + entity_start(cur_label,color_mappings);
            } else {
                ann_id_stack.push(off.id);
                out_text += cur_text + entity_start(cur_label,color_mappings);
            }
        } else if (off.type === "end") {
            if (ann_id_stack.length === 0) {
                // error
                console.log('invalid annotation?')
            } else if (ann_id_stack[ann_id_stack.length-1] !== off.id) {
                //overlap

                var secondary_stack = [];
                //pop and close into secondary stack until I've found the off.id
                out_text += cur_text
                while (ann_id_stack[ann_id_stack.length-1] !== off.id&&ann_id_stack.length-1){
                    var cur_obj = ann_id_stack.pop();

                    secondary_stack.push(cur_obj);
                    out_text += entity_end(ann_list[cur_obj]);
                }
                var curloc = ann_id_stack.pop();
                out_text += entity_end(ann_list[curloc]);
                try{//if there are repeating ends at the same place
                    while(ann_list[curloc].end ===ann_list[ann_id_stack[ann_id_stack.length-1]].end){
                        var curloc = ann_id_stack.pop();
                        out_text += entity_end(ann_list[curloc]);
                        ind++;
                    }
                }catch(error){

                }


                while (secondary_stack.length){
                    var insert = secondary_stack.pop();
                    ann_id_stack.push(insert);
                    var to_start = ann_list[insert];
                    to_start["overflow"] = true;
                    out_text += entity_start(ann_list[insert],color_mappings);
                }
            } else {
                var curloc = ann_id_stack.pop()
                out_text += cur_text + entity_end(ann_list[curloc]);

            }
        }

    }
    out_text += text.substring(cur_start);
    return out_text;
}
