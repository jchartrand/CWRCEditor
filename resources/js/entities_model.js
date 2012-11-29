var EntitiesModel = function() {
	var entities = {
		person: {
			title: 'Person',
			mapping: {
				cwrcbasic: '<person>{{editorText}}</person>',
				events: '<NAME>{{editorText}}</NAME>'
			}
		},
		date: {
			title: 'Date',
			mapping: {
				cwrcbasic: '<date when="{{date}}" from="{{startDate}}" to="{{endDate}}">{{editorText}}</date>',
				events: '<DATE VALUE="{{date}}">{{editorText}}</DATE>' // TODO dateRange
			}
		},
		place: {
			title: 'Place',
			mapping: {
				cwrcbasic: '<place cert="{{certainty}}">{{editorText}}</place>',
				events: '<PLACE>{{editorText}}</PLACE>'
			}
		},
		event: {
			title: 'Event',
			mapping: {
				cwrcbasic: '<event cert="{{certainty}}">{{editorText}}</event>',
				events: ''
			}
		},
		org: {
			title: 'Organization',
			mapping: {
				cwrcbasic: '<org cert="{{certainty}}">{{editorText}}</org>',
				events: '<ORGNAME>{{editorText}}</ORGNAME>'
			}
		},
		citation: {
			title: 'Citation',
			mapping: {
				cwrcbasic: '<cit><quote>{{editorText}}</quote><ref>{{citation}}</ref></cit>'
			}
		},
		note: {
			title: 'Note',
			mapping: {
				cwrcbasic: '<note type="{{type}}" ana="{{content}}">{{editorText}}</note>'
			}
		},
		correction: {
			title: 'Correction',
			mapping: {
				cwrcbasic: '<sic><corr cert="{{certainty}}" type="{{type}}" ana="{{content}}">{{editorText}}</corr></sic>',
				events: '<SIC CORR="{{content}}">{{editorText}}</SIC>'
			}
		},
		keyword: {
			title: 'Keyword',
			mapping: {
				cwrcbasic: '<keywords scheme="http://classificationweb.net"><term sameAs="{{id|keyword}}" type="{{type}}">{{editorText}}</term></keywords>',
				events: '<KEYWORDCLASS>{{editorText}}</KEYWORDCLASS>'
			}
		},
		link: {
			title: 'Link',
			mapping: {
				cwrcbasic: '<ref target="{{url}}">{{editorText}}</ref>',
				events: '<XREF URL="{{url}}">{{editorText}}</XREF>'
			}
		},
		title: {
			title: 'Text/Title',
			mapping: {
				cwrcbasic: '<title level="{{level}}">{{editorText}}</title>',
				events: '<TITLE TITLETYPE="{{level}}">{{editorText}}</TITLE>'
			}
		}
	};
	
	function doMapping(entity, map) {
		return map.replace(/{{(.*?)}}/g, function(match, p1) {
			if (/\|/.test(p1)) {
				var infoKeys = p1.split('|');
				for (var i = 0; i < infoKeys.length; i++) {
					var key = infoKeys[i];
					if (entity.info[key]) {
						return entity.info[key];
					}
				}
			} else if (entity.info[p1]) {
				return entity.info[p1];
			} else if (p1 == 'editorText') {
				return entity.props.content;
			}
		});
	}
	
	var em = {};
	em.isEntity = function(type) {
		return entities[type] == null;
	};
	em.getTitle = function(type) {
		var e = entities[type];
		if (e) {
			return e.title;
		}
		return null;
	};
	em.getMapping = function(entity, schema) {
		var e = entities[entity.props.type];
		if (e) {
			if (e.mapping && e.mapping[schema]) {
				var mappedString = doMapping(entity, e.mapping[schema]);
				return mappedString;
			}
		}
		return null;
	};
	// returns the mapping as an array of opening and closing tags
	em.getMappingTags = function(entity, schema) {
		var e = entities[entity.props.type];
		if (e) {
			if (e.mapping && e.mapping[schema]) {
				var tags = [];
				var maps = e.mapping[schema].split('{{editorText}}');
				for (var i = 0; i < maps.length; i++) {
					tags.push(doMapping(entity, maps[i]));
				}
				return tags;
			}
		}
		return null;
	};
	
	return em;
};