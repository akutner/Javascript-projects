import riithon.report_utils as report_utils
import riithon.annotations as anns
import webbrowser
import http.server 
import socketserver
from http.server import HTTPServer, BaseHTTPRequestHandler
from PIL import Image
import json
import jsonlines
import itertools
PORT = 0
import random
_HEX ='CDEF'

global cur_ind
#parse args and send to data.json and .config
import argparse
class S(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.ind = 0
        super(S, self).__init__(*args, **kwargs)

    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
    def do_GET(self):
        self._set_headers()
        if(self.path == "/"):
            f = open("index.html", "r")
        else:
            try:
                f = open("."+self.path.split('?')[0], "r")
            except:
                pass
        try:
            self.wfile.write(bytes(f.read(),'utf-8'))
        except:
            pass

    def do_HEAD(self):
        self._set_headers()

    def do_POST(self):
        self._set_headers()
        self.data_string = self.rfile.read(int(self.headers['Content-Length']))
        data = json.loads(self.data_string)
        #print(data)
        data = getData(doc, data['ind'])
        formats = getFormats(config)
        types =getTypes(config, data,formats)
        self.wfile.write(bytes(json.dumps(data).replace("NaN","0"),'utf-8'))
        self.end_headers()
        return




def run(server_class=HTTPServer, handler_class=S, port=80):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print('Starting httpd...')
    httpd.serve_forever()
def getData(doc,cur_ind=0,size = 5):
    data = []
    with jsonlines.open(doc, 'r') as reader:
        for obj in itertools.islice(reader,cur_ind,cur_ind+size):
            data.append(obj)
    #parsing to workable format...
    cur_ind+=5
    return data
def getTypes(config, data,formats):
    types = {}
    try:
        with open(config) as f: 
            types = json.load(f)['types']
    except:
        pass
    do = anns.Doc.load(doc)
    for d in data:
        for ann in d.get('anns'):
            i=0
            if ann.get('ent_type'):
                ann['label'] = ann['ent_type']
            elif ann.get('ann_type'):
                ann['label'] = ann['ann_type']
            ann['id'] =str(i)
            obj = do.anns[i]
            if(ann['$type'] in formats.keys()):
                form = formats[obj.type_name()]
                f = createFormat(form,obj)
                form = form.replace(".","")
                ann['format'] = form.format(**f);
            try:
                if ann['$type'] not in types.keys():
                    types[ann['$type']] = getRandomColor()
            except:
                ann['$type'] = "no_type"
            try: 
                if ann['label'] not in types.keys():
                    types[ann['label']] = getRandomColor()
            except:
                pass
            i+=1
    return types

def createFormat(form,obj):
    #parse out what its asking for
    attrs= {}
    items = form.split("{")[1:]#assuming not starting with an attribute of obj
    for x in items:
        cur_obj = obj
        for a in (x.split("}")[0].split('.')):
            method = ""
            try:
                if str(int(a)) == a:
                    a = int(a)
            except:
                pass
            try:
                method = getattr(cur_obj,a)
                cur_obj = cur_obj[a]
            except:
                pass
            try:
                cur_obj = cur_obj[a]
            except:
                pass
        try:
            if str(float(method)) == method:
                method= str(float(round(float(method),4)))
        except:
            pass
        attrs[x.split("}")[0].replace('.',"")] = method
    #print(attrs)
    return attrs
#dafa



def getColorings(config):
    colorings = []
    try:
        with open(config) as f:
            cur = json.load(f)['colorings']
        for color in cur:
            colorings.append('\"'+color+'\"')
    except:
        return []
    return colorings

def writeMappings(types):
    configstr = "var color_mappings ="+json.dumps(types)
    f = open(".config","w")
    f.write(configstr)
    f.close()


def getFormats(config):
    formats = {}
    try:
        with open(config) as f:
            formats = json.load(f)['formats']
    except:
        pass
    return formats

    


def getRandomColor():
    return '#' + "".join(random.choice(_HEX) for _ in range(6))


parser = argparse.ArgumentParser()
parser.add_argument('--doc_src',
                    default="./data-default.jsonl",
                    help='Enter data source')
parser.add_argument('--config_src',
                    default='.config-default',
                    help='Enter color source')


args = parser.parse_args()
doc= args.doc_src
config = args.config_src
data= getData(doc)#gets first 5 items of given doc
formats = getFormats(config)
types =getTypes(config, data,formats)
writeMappings(types)
#report_utils.writeAnnotationScript()
colorings = getColorings(config)

#writes annotations and colorings to js
report_utils.writeColoringsScript(colorings)
#Handler = http.server.SimpleHTTPRequestHandler
Handler = S
with  socketserver.TCPServer(("",PORT), Handler) as httpd:
    print("serving at port", httpd.server_address[1])
    webbrowser.open("http://localhost:"+str(httpd.server_address[1]))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()





