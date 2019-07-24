from flask import Flask, request
from flask_cors import CORS, cross_origin
from flask_restful import Resource, Api, reqparse
from json import dumps
from flask_jsonpify import jsonify
import spacy

app = Flask(__name__)
api = Api(app)

CORS(app)

parser = reqparse.RequestParser()
spacy_nlp = spacy.load('en_core_web_sm')

class ExtractNER(Resource):
    def post(self):
        parser.add_argument('text', type=str)
        args = parser.parse_args()
        document = spacy_nlp(args['text'])
        result = {'data':{}}
        for element in document.ents:
            print('Type: %s, Value: %s' % (element.label_,element))
            if str(element.label_) in result['data'].keys():
                result['data'][str(element.label_)]+=', '+str(element)
            else:
                result['data'][str(element.label_)] =str(element)
        return jsonify(result)


api.add_resource(ExtractNER, '/ner') # Route_1


if __name__ == '__main__':
    app.run(host='0.0.0.0',port=5002)