var x= -5;
var data = []

//var colorings = ["textcat.GeneralEvent.soft_predictions.yes"]





function toggleclicked(label){
    //console.log(e)
    try{
        document.getElementById(label.id).checked = !document.getElementById(label.id).checked;
        var ls = document.getElementById(label.id.replace('_check','_ls')).getElementsByTagName('li')
        if(ls){
            for (var i = 0; i < ls.length; ++i) {
                ls[i].getElementsByTagName('input')[0].checked=document.getElementById(label.id).checked;
            }
        }
    }catch(error){
        console.log(error);
    }
    //console.log('toggle')
    console.log( document.getElementById(label.id).checked )
    refreshDoc(data);

}

function getind(v){
    x+=v;
    if(x<0){
        x=0;
    }
    return x;
}


function post(v=5){
    let a = getind(v)
    return $.ajax({
        url:"http://localhost:"+location.port,
        type:"post",
        data:'{"ind":'+a+'}',
        contentType: "application/json",


    }).then((response) =>{
        let o = JSON.parse(response)
        if (!o.length || x <0){
            getind(-2*v);//alert!! out of bounds
            //console.log(x)
        }else{
            refreshDoc(o);
        }
    });
}


function refreshDoc(d){
    data = d;
    //console.log(d)
    var irr_types = new Set();
    var ann_list = new Set();
    document.getElementById("coloring_selector").innerHTML = setColorings()
    for(item of d){
        var annotations = item.anns;
        //pull from type selector
        for (let ann of annotations){
            if(!ann['label']){
                ann['label']= ann['$type']
            }
            ann_list.add(ann)
            try{
                //console.log(ann)
                var as_id = ann['$type'].replace(/\./g,'')
                if(document.getElementById(as_id+'_check').checked === false){
                    irr_types.add(as_id);
                }
            }catch(error){
                //console.log(error)
            }
            try{
                if(document.getElementById(ann['label']+"_check").checked === false){
                    irr_types.add(ann['label']);
                }
                
            }catch(error){}
        }
    }
    labellist(ann_list,irr_types);
    var i =0;
    for (item of d){
        reRender(item.text,item.anns,irr_types, i);
        i++;
    }
    for(;i<5;i++){
        document.getElementById("annotation_text_"+i).innerHTML = "";
    }
}

function refresh(){
    refreshDoc(data);
}

/*
function refresh(){
    var el = document.createElement("script");//reloads data
    //el.src = './data.json?nocache=' + (new Date()).getTime();
    el.src = "./data.json"
    document.head.appendChild(el);
    var irr_types = []
    var ann_list = []

    for(item of data){
        var annotations = item.anns;
        //pull from type selector
        for (let ann of annotations){
            ann_list.push(ann)
            try{
                if(document.getElementById(ann.label+"_check").checked === false){
                    irr_types.add(ann['label']);
                }
                
                if(document.getElementByID(ann.type.replace(/\./g,'')+'_check').checked === false){
                    irr_types.add(ann['label']);
                    irr_types.add(ann['type']);
                }
            }catch(error){}
        }
    }
    labellist(ann_list,irr_types);
    var i =0;

    for (item of data){
        reRender(item.text,item.anns,irr_types, i);
        i++;
    }

    for(;i < 5;i++){
        document.getElementById("annotation_text_"+i).innerHTML = "";
    }
}*/
function reRender(text, annotations, irr_types, num =0){
    let val = 0;
    try{
        val = document.querySelector('input[name = "coloring"]:checked').value;
    }catch(error){
        val=0;
    }

    var out = annotateText(text,annotations,Array.from(irr_types),color_mappings,val);
    document.getElementById("annotation_text_"+num).innerHTML = out;
}



function getLabelOfType(annotations,type){
    var out_text= "";
    var out_list = [];
    var out_set = new Set();
    var color = "color: "+color_mappings[type]
    var type_id = type.replace(/\./g,'')
    out_list.push('<li style = "'+
        color+';" onclick = "toggleclicked('+
        type_id+'_check)"><input onclick = "toggleclicked('+
        type_id+'_check)" id = "'+
        type_id+'_check" type="checkbox"  checked>'+
        type+'</li>')
    out_list.push('<ul id = "'+type_id+'_ls">')
    for(var ann of annotations){
        if(ann['$type'] === type && ann['label']){
            let color = "";
            try{
                color ="color: "+color_mappings[ann['label']]
            }catch(error){
                //console.log(error)
                color = "color: "+color_mappings[ann['$type']]
            }
            //console.log(color)

            
            out_set.add('<li style = "'+
                color+';" onclick = "toggleclicked('+
                ann['label']+'_check)"><input onclick = "toggleclicked('+
                ann['label']+'_check)" id = "'+
                ann['label']+'_check" type="checkbox"  checked>'+
                ann['label']+'</li>')
        }
    
    }
    out_list= out_list.concat([...out_set])
    out_list.push('</ul>')
    for(let li of out_list){
        out_text+=li;
    }

    return out_text;
}

function getLabels(annotations){
    var out_text = "";
    var out_list = [];
    var out_set = new Set()
    for(var ann of annotations){
        try{
            if(!out_set.has(ann['$type'])){
                out_list = out_list.concat(this.getLabelOfType(annotations,ann['$type']))
                out_set.add(ann['$type']);
            }
        }
        catch(error){
            //console.log(error)
            color = "color: "+color_mappings[ann['$type']]
            out_list.push('<li style = "'+
                color+';" onclick = "toggleclicked('+
                ann['label']+'_check)"><input onclick = "toggleclicked('+
                ann['label']+'_check)" id = "'+
                ann['label']+'_check" type="checkbox"  checked>'+
                ann['label']+'</li>')
        }
    }
    for(let li of out_list){
        out_text+=li;
    }

    return out_text;
}



function labellist(annotations, irr_types){
    var out = getLabels(annotations);
    document.getElementById("labels").innerHTML = out;
    for (let ann of irr_types){ 
        document.getElementById(ann+"_check").checked = false;
    }
}

//returns a list of radio buttons for the colorings
function setColorings(){
    var out_text = [];

    for(i in colorings){
        let checked = ""
        try{
        if(document.querySelector('input[name = "coloring"]:checked').value==colorings[i]){
            checked=" checked";
        }
        }catch(error){console.log(error)}
        out_text+=('<input type = "radio" id = "'+i+'" onclick = "refresh()" name="coloring" value= "'+colorings[i]+'"'+checked+'>'+
            '<label for="'+i+'">'+colorings[i]+'</label><br>');
    }
    console.log(out_text);
    return(out_text);
}

