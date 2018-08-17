from elasticsearch import Elasticsearch, helpers
import json
import datetime


class ESQuery:

    # keys used in aggregations
    MISSING_KEY = 'missing'
    OTHER_KEY = 'other'

    # e.g.: '2017-09-07T00:00:00+0000'
    DEFAULT_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ssZ"
    PYTHON_DEFAULT_DATE_FORMAT = '%Y-%m-%dT%H:%M:%SZ'

    MATCH_ALL_QUERY = {"query": {"match_all": {}}}

    def __init__(self, es_host, index=None, doc_type=None, **kwargs):
        """
        es_host - can be either host string or Elasticsearch object
        """

        if isinstance(es_host, Elasticsearch):
            self.es = es_host
        else:
            self.es_host = es_host
            self.es = Elasticsearch(self.es_host, **kwargs)

        self.default_index = index
        self.default_type = doc_type

    @staticmethod
    def add_flags(parser):
        parser.add_argument('--es_host', help='elasticsearch host, e.g. http://localhost:9200')
        parser.add_argument('--es_index', help='elasticsearch index')
        parser.add_argument('--es_type', help='es type to query/index')

    @staticmethod
    def from_args(args):
        es_host = args.es_host
        es_index = args.es_index
        es_type = args.es_type
        return ESQuery(es_host=es_host, index=es_index, doc_type=es_type)

    @staticmethod
    def term_match_clause(field, val):
        """simple term match"""
        if isinstance(val, str):
            query = {"term": {field: val}}
        elif isinstance(val, list):
            query = {"terms": {field: val}}
        else:
            raise ValueError('Unknown val type: {}'.format(type(val)))
        return query

    @staticmethod
    def field_exists_clause(field):
        """query for the existence of a field, use bool must_not to test for absence """
        return {"exists": {"field": field} }

    @staticmethod
    def query_string_clause(q, default_field=None):
        """query based on lucene-style query string"""
        q = {
            "query_string": {
                "query": q
            }
        }
        if default_field is not None:
            q['query_string']['default_field'] = default_field
        return q

    @staticmethod
    def date_range_clause(field, start=None, end=None, date_format=None):
        """date range query"""
        if isinstance(start, datetime.datetime):
            start = start.strftime(ESQuery.PYTHON_DEFAULT_DATE_FORMAT)
        if isinstance(end, datetime.datetime):
            end = end.strftime(ESQuery.PYTHON_DEFAULT_DATE_FORMAT)
        if date_format is None:
            date_format = ESQuery.DEFAULT_DATE_FORMAT
        range_dict = {}
        if start:  # don't use if None or empty string
            range_dict['gte'] = start
        if end:  # don't use if None or empty string
            range_dict['lt'] = end
        if date_format is not None:
            range_dict['format'] = date_format
        range_query = {"range": {
            field: range_dict
        }}
        return range_query

    @staticmethod
    def get_query(must_clauses=[], must_not_clauses=None):
        """join basic queries into boolean query"""
        if must_clauses != None and not isinstance(must_clauses, list):
            must_clauses = [must_clauses]
        query = {
            "query": {
                "bool": {}
            }
        }
        if must_clauses != None:
            query['query']['bool']['must'] = must_clauses

        if must_not_clauses != None:
            query['query']['bool']['must_not'] = must_not_clauses

        return query

    @staticmethod
    def term_agg(name, field, size=25):
        """basic term aggregation"""
        return {
            "aggs" : {
                name : {
                    "terms" : {
                        "field" : field,
                        "size": size
                    }
                }
            }
        }

    @staticmethod
    def date_histogram_agg(name, field, interval='1h'):
        """ date histogram aggregation, default interval is 1 hour"""
        return {
            "aggs" : {
                name : {
                    "date_histogram" : {
                        "field" : field,
                        "interval" : interval
                    }
                }
            }
        }


    def get_index_and_type(self, index, doc_type):
        """update index and type with object versions if unspecified"""
        if index is None:
            index = self.default_index
        if index is None:
            raise ValueError("index must be set!")
        if doc_type is None:
            doc_type = self.default_type
        return index, doc_type

    def get_missing_field_count(self, base_query, term, index=None, doc_type=None):
        """count the number of documents missing the field 'term' """
        query = self.get_query(base_query)
        total = self.get_search_count(query=query, index=index)
        query = self.get_query(base_query,
                               must_not_clauses={
                                   "exists": {
                                       "field": term
                                   }
                               })
        missing = self.get_search_count(query=query, index=index, doc_type=doc_type)
        return total, missing

    def get_search_count(self, query, index=None, doc_type=None):
        """just count the number of documents matching the given query"""
        index, doc_type = self.get_index_and_type(index, doc_type)
        results = self.es.search(index=index, doc_type=doc_type, body=query, size=0, timeout='60s', request_timeout=60)
        return results['hits']['total']

    def get_term_agg_data(self, base_query, term, index=None, doc_type=None, size=10, add_missing=True, add_other=True):
        """get results of a term aggregation"""
        agg = self.term_agg(term+"_agg", term, size=size)
        query = self.get_query(base_query)
        bins = self.get_agg_data(query=query, agg=agg, index=index, doc_type=doc_type)

        if add_missing or add_other:
            # calculate the number of documents where this field is missing
            num_total, num_missing = \
                self.get_missing_field_count(base_query=base_query, term=term, index=index)

            if add_missing and num_missing > 0:
                bins[self.MISSING_KEY] = num_missing
            num_other = num_total-num_missing-sum(bins.values())
            if add_other and num_other > 0:
                bins[self.OTHER_KEY] = num_other

        return bins

    def get_agg_data(self, query, agg, index=None, doc_type=None):
        """ Return aggregation results for the given index, query, and agg """
        index, doc_type = self.get_index_and_type(index, doc_type)
        agg_name = list(agg['aggs'].keys())[0]
        _time_agg = dict(query)
        _time_agg.update(agg)
        # print(json.dumps(_time_agg, indent=2))
        response = self.es.search(index=index, doc_type=doc_type, body=_time_agg, size=0, timeout='60s', request_timeout=60)
        # handle bucket aggs
        agg_response = response['aggregations'][agg_name]
        if agg_response.get('buckets') is not None:
            buckets = response['aggregations'][agg_name]['buckets']
            bins = dict([(_bucket['key'], _bucket['doc_count']) for _bucket in buckets])
            return bins
        # handle single-value aggs
        elif agg_response.get('value') is not None:
            return agg_response['value']
        else:
            raise ValueError('unknown response (unhandled agg type?): \n' +
                             json.dumps(agg_response, indent=2))

    def get_sorted_agg_data(self, query, agg, index=None, doc_type=None):
        """
        return agg in (key_list, value_list) format, with lists sorted by key value
        """
        bins = self.get_agg_data(query, agg, index=index, doc_type=doc_type)
        if len(bins) == 0:
            return [], []
        else:
            return zip(*sorted(bins.items(), key=lambda x: x[0]))

    def get_query_scanner(self, query, index=None, doc_type=None, batch_size=1000, scroll=u'30m'):
        """
        return iterator over ES scroll results.
        """

        index, doc_type = self.get_index_and_type(index, doc_type)

        return helpers.scan(self.es,
                            query=query,
                            scroll=scroll,
                            raise_on_error=True,
                            preserve_order=True,
                            size=batch_size,
                            timeout='60s',
                            request_timeout=60,
                            index=index,
                            doc_type=doc_type)
