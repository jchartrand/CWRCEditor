/**
 * Contains the load and save dialogs, as well as file related functions.
 */
var FileManager = function(config) {
	
	var w = config.writer;
	
	var currentDoc = null;
	
	var docNames = [];
	
	$(document.body).append(''+
		'<div id="loader">'+
			'<div id="files"><ul class="searchResults"></ul></div>'+
		'</div>'+
		'<div id="saver">'+
			'<label for="filename">Name</label>'+
			'<input type="text" name="filename"/>'+
			'<p>Please enter letters only.</p>'+
		'</div>'+
		'<div id="entitiesConverter"></div>'+
		'<div id="editSourceDialog">'+
			'<textarea style="width: 100%; height: 98%;"></textarea>'+
		'</div>'+
		'<iframe id="editDocLoader" style="display: none;"></iframe>'
	);
	
	var loader = $('#loader');
	loader.dialog({
		title: 'Load Document',
		modal: true,
		height: 450,
		width: 300,
		autoOpen: false,
		buttons: {
			'Load': function() {
				var data = $('#files ul li.selected').data();
				if (data) {
					fm.loadDocument(data.name);
					loader.dialog('close');
				} else {
					$('#files').css({borderColor: 'red'});
				}
			},
			'Cancel': function() {
				loader.dialog('close');
			}
		}
	});
	
	var saver = $('#saver');
	saver.dialog({
		title: 'Save Document As',
		modal: true,
		resizable: false,
		height: 150,
		width: 300,
		autoOpen: false,
		buttons: {
			'Save': function() {
				var name = $('#saver input').val();
				
				if (!_isNameValid(name)) {
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'You may only enter upper or lowercase letters; no numbers, spaces, or punctuation.'
					});
					return;
				} else if (name == 'info') {
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'This name is reserved, please choose a different one.'
					});
					return;
				}
				
				if ($.inArray(name, docNames) != -1) {
					// TODO add overwrite confirmation
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'This name already exists, please choose a different one.'
					});
					return;
				} else {
					currentDoc = name;
					fm.validate(true);
					saver.dialog('close');
				}
			},
			'Cancel': function() {
				saver.dialog('close');
			}
		}
	});
	
	var edit = $('#editSourceDialog');
	edit.dialog({
		title: 'Edit Source',
		modal: true,
		resizable: true,
		closeOnEscape: true,
		height: 480,
		width: 640,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				var newDocString = $('textarea', edit).val();
				$('#editDocLoader').contents().find('html').html(newDocString);
				w.entities = {};
				w.structs = {};
				_loadDocumentHandler($('#editDocLoader').contents()[0]);
				edit.dialog('close');
			},
			'Cancel': function() {
				edit.dialog('close');
			}
		}
	});
	
	var fm = {};
	
	fm.openLoader = function() {
		$('#files').css({borderColor: '#fff'});
		_getDocuments(function() {
			_populateLoader();
			loader.dialog('open');
		});
	};
	
	fm.openSaver = function() {
		_getDocuments();
		saver.dialog('open');
	};
	
	var _getDocuments = function(callback) {
		$.ajax({
			url: w.baseUrl+'editor/documents',
			type: 'GET',
			dataType: 'json',
			success: [function(data, status, xhr) {
				docNames = data;
			}, callback],
			error: function() {
				var doc = $.parseXML('<?xml version="1.0" encoding="UTF-8"?><TEI xmlns="http://www.tei-c.org/ns/1.0" xml:id="struct_11"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:w="http://cwrctc.artsrn.ualberta.ca/#"></rdf:RDF><teiHeader xmlns="http://www.tei-c.org/ns/1.0" xml:id="struct_12"> <fileDesc xml:id="struct_13"> <titleStmt xml:id="struct_14"> <title xml:id="struct_15">Put title here.</title> </titleStmt> <publicationStmt xml:id="struct_16"> <p xml:id="struct_17">Put publication statement here.</p> </publicationStmt> <sourceDesc xml:id="struct_18"> <p xml:id="struct_19">Put description of source here.</p> </sourceDesc> </fileDesc> </teiHeader> <text xmlns="http://www.tei-c.org/ns/1.0" xml:id="struct_20"> <body xml:id="struct_21"> <div type="letter" xml:id="struct_22"> <opener xml:id="struct_23"> Put any opening text here. <dateline xml:id="struct_25"> <date xml:id="struct_26">Put dateline here.</date> </dateline> <salute xml:id="struct_27">Put opening salutation here.</salute> </opener> <p xml:id="struct_28">Put text of letter here. Press return for more paragraphs. Place an pb element for page breaks.</p> <closer xml:id="struct_29"> <salute xml:id="struct_30">Put closing salutation here.</salute> <signed xml:id="struct_31"> <persName xml:id="struct_32">Signature here.</persName> </signed> </closer> </div> </body> </text></TEI>');
				_loadDocumentHandler(doc);
			}
		});
//		var data = {
//			response: []
//		};
//		var length = Math.ceil(Math.random()*10);
//		for (var i = 0; i < length; i++) {
//			data.response.push('Random Doc '+i);
//		}
//		docNames = data.response;
//		if (callback) callback();
	};
	
	var _populateLoader = function() {
		var formattedResults = '';
		var last = '';
		var d, i;
		for (i = 0; i < docNames.length; i++) {
			d = docNames[i]; 
			
			if (i == docNames.length - 1) last = 'last';
			else last = '';
			
			formattedResults += '<li class="unselectable '+last+'">';
			formattedResults += '<span>'+d+'</span>';
			formattedResults += '</li>';
		}
		
		$('#files ul').first().html(formattedResults);
		
		$('#files ul li').each(function(index) {
			$(this).data({name: docNames[index]});
		});
		
		$('#files ul li').click(function(event) {
			$('#files').css({borderColor: '#fff'});
			var remove = $(this).hasClass('selected');
			$('#files ul li').removeClass('selected');
			if (!remove) $(this).addClass('selected');
		});
		
		$('#files ul li').dblclick(function(event) {
			$('#files ul li').removeClass('selected');
			$(this).addClass('selected');
			fm.loadDocument($(this).data('name'));
			loader.dialog('close');
		});
	};
	
	var _isNameValid = function(name) {
		return name.match(/[^A-Za-z]+/) == null;
	};
	
	fm.validate = function(isSave) {
		var docText = _exportDocument(false);
		$.ajax({
			url: w.baseUrl+'services/validator/validate.html',
			type: 'POST',
			dataType: 'XML',
			data: {
				sch: 'http://cwrc.ca/schema/'+w.validationSchema,
				type: 'RNG_XML',
				content: docText
			},
			success: function(data, status, xhr) {
				_validationHandler(data, isSave);
			},
			error: function() {
				w.d.show('message', {
					title: 'Error',
					msg: 'An error occurred while trying to validate '+currentDoc+'.'
				});
			}
		});
	};
	
	var _validationHandler = function(data, isSave) {
		var doc = currentDoc;
		if (doc == null) doc = 'The current document';
		if ($('status', data).text() != 'pass') {
			var errors = '<ul>';
			$('error', data).each(function(index, el) {
				errors += '<li>'+$(this).find('message').text()+'</li>';
			});
			errors += '</ul>';
			if (isSave) {
				w.d.confirm({
					title: 'Document Invalid',
					msg: doc+' is not valid. <b>Save anyways?</b><br/>'+errors,
					callback: function(yes) {
						if (yes) {
							fm.saveDocument();
						}
					}
				});
			} else {
				w.d.show('message', {
					title: 'Document Invalid',
					msg: doc+' is not valid.<br/>'+errors
				});
			}
		} else {
			if (isSave) {
				fm.saveDocument();
			} else {
				var warnings = '';
				if ($('warning', data).length > 0) {
					warnings += '<ul>';
					$('warning', data).each(function(index, el) {
						warnings += '<li>'+$(this).find('message').text()+'</li>';
					});
					warnings += '</ul>';
				}
				w.d.show('message', {
					title: 'Document Valid',
					msg: doc+' is valid.<br/>'+warnings
				});
			}
		}
	};
	
	fm.saveDocument = function() {
		if (currentDoc == null) {
			fm.openSaver();
		} else {
			var docText = _exportDocument(true);
			$.ajax({
				url: w.baseUrl+'editor/documents/'+currentDoc,
				type: 'PUT',
				dataType: 'json',
				data: docText,
				success: function(data, status, xhr) {
					w.editor.isNotDirty = 1; // force clean state
					w.d.show('message', {
						title: 'Document Saved',
						msg: currentDoc+' was saved successfully.'
					});
				},
				error: function() {
					w.d.show('message', {
						title: 'Error',
						msg: 'An error occurred and '+currentDoc+' was not saved.'
					});
				}
			});
		}
	};
	
	var _exportDocument = function(includeRDF) {
		// remove highlights
		w.highlightEntity();
		
		var idName = w.validationSchema == 'cwrcbasic' ? 'xml:id' : 'id';
		
		var xmlString = '<?xml version="1.0" encoding="UTF-8"?>';
		
		var body = $(w.editor.getDoc().body);
		var clone = body.clone(false, true); // make a copy, don't clone body events, but clone child events
		
		_entitiesToUnicode(body);
		
		function nodeToStringArray(node) {
			var array = [];
			var tag = node.attr('_tag') || node.attr('_type');
			var openingTag = '<'+tag;
			var id = idName;
			$(node[0].attributes).each(function(index, att) {
				var attName = att.name;
				if (attName.indexOf('_') != 0) {
					if (attName == 'id' && attName != id) attName = id;
					openingTag += ' '+attName+'="'+att.value+'"';
				}
			});
			openingTag += '>';
			array.push(openingTag);
			
			var closingTag = '</'+tag+'>';
			array.push(closingTag);
			
			return array;
		}
		
		function buildXMLString(currentNode) {
			var tags = nodeToStringArray(currentNode);
			xmlString += tags[0];
			currentNode.contents().each(function(index, el) {
				if (el.nodeType == 1) {
					buildXMLString($(el));
				} else if (el.nodeType == 3) {
					xmlString += el.data;
				}
			});
			xmlString += tags[1];
		}
		
		if (w.mode == w.XMLRDF) {
			var head = '';
			if (includeRDF) {
				var offsets = [];
				_getNodeOffsets(body, offsets);
				body.find('[_entity]').remove();
				head = '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:w="http://cwrctc.artsrn.ualberta.ca/#">';
				
				// entities
				for (var i = 0; i < offsets.length; i++) {
					var o = offsets[i];
					head += '\n<rdf:Description rdf:ID="'+o.id+'">';
					var key;
					for (key in o) {
						head += '\n<w:'+key+' type="offset">'+o[key]+'</w:'+key+'>';
					}
					var entry = w.entities[o.id];
					head += '\n<w:type type="props">'+entry.props.type+'</w:type>';
					head += '\n<w:content type="props">'+entry.props.content+'</w:content>';
					for (key in entry.info) {
						head += '\n<w:'+key+' type="info">'+entry.info[key]+'</w:'+key+'>';
					}
					head += '\n</rdf:Description>';
				}
				
				// triples
				for (var i = 0; i < w.triples.length; i++) {
					var t = w.triples[i];
					head += '\n<rdf:Description rdf:about="'+t.subject.uri+'" w:external="'+t.subject.external+'">'+
					'\n<w:'+t.predicate.name+' w:text="'+t.predicate.text+'" w:external="'+t.predicate.external+'">'+
					'\n<rdf:Description rdf:about="'+t.object.uri+'" w:external="'+t.object.external+'" />'+
					'\n</w:'+t.predicate.name+'>'+
					'\n</rdf:Description>';
				}
				
				head += '</rdf:RDF>';
			}
			
			var root = body.children(w.root);
			var tags = nodeToStringArray(root);
			xmlString += tags[0];
			xmlString += head;
			
			root.contents().each(function(index, el) {
				if (el.nodeType == 1) {
					buildXMLString($(el));
				} else if (el.nodeType == 3) {
					xmlString += el.data;
				}
			});
			
			xmlString += tags[1];
		} else {
			for (var id in w.entities) {
				var markers = w.editor.dom.select('[name="'+id+'"]');
				var start = markers[0];
				var end = markers[1];
				
				var nodes = [start];
				var currentNode = start;
				while (currentNode != end  && currentNode != null) {
					currentNode = currentNode.nextSibling;
					nodes.push(currentNode);
				}
				
				var attributes = ' id="'+id+'" _type="'+w.entities[id].props.type+'"';
				for (var key in w.entities[id].info) {
					attributes += ' '+key+'="'+w.entities[id].info[key]+'"';
				}
				
				w.editor.$(nodes).wrapAll('<entity'+attributes+'/>');
				w.editor.$(markers).remove();
			}
			buildXMLString(w.editor.$(w.root));
		}
		body.replaceWith(clone);
		return xmlString;
	};
	
	var _entitiesToUnicode = function(parentNode) {
		var contents = $(parentNode).contents();
		contents.each(function(index, el) {
			if (el.nodeType == Node.TEXT_NODE) {
				if (el.nodeValue.match(/&.+?;/gim)) {
					$('#entitiesConverter')[0].innerHTML = el.nodeValue;
					el.nodeValue = $('#entitiesConverter')[0].innerText || $('#entitiesConverter')[0].firstChild.nodeValue;
				}
			} else if (el.nodeType == Node.ELEMENT_NODE) {
				_entitiesToUnicode(el);
			}
		});
	};
	
	var _getNodeOffsets = function(parent, offsets) {
		var currentOffset = 0;
		parent.contents().each(function(index, element) {
			if (this.nodeType == Node.TEXT_NODE) {
				currentOffset += this.length;
			} else if ($(this).is(w.root) || $(this).attr('_struct')) {
				_getNodeOffsets($(this), offsets);
			} else if ($(this).attr('_entity') && $(this).hasClass('start')) {
				var id = $(this).attr('name');
				offsets.push({
					id: id,
					parent: $(parent).attr('id'),
					offset: currentOffset,
					length: w.entities[id].props.content.length
				});
			} else if (w.titles[this.nodeName.toLowerCase()] != null) {
				var id = $(this).attr('id');
				offsets.push({
					id: id,
					parent: $(parent).attr('id'),
					offset: currentOffset,
					length: $(this).text().length
				});
			}
		});
	};
	
	fm.loadDocument = function(docName) {
		currentDoc = docName;
		
		w.entities = {};
		w.structs = {};
		w.triples = [];
		
		$.ajax({
			url: w.baseUrl+'editor/documents/'+docName,
			type: 'GET',
			success: _loadDocumentHandler,
			error: function(xhr, status, error) {
				currentDoc = null;
				w.d.show('message', {
					title: 'Error',
					msg: 'An error ('+status+') occurred and '+docName+' was not loaded.'
				});
			},
			dataType: 'xml'
		});
	};
	
	var _loadDocumentHandler = function(doc) {
		var rootName, idName;
		var isEvents = doc.getElementsByTagName('EVENTS').length > 0;
		if (isEvents) {
			rootName = 'events';
			idName = 'id';
		} else {
			rootName = 'tei';
			idName = 'xml:id';
		}
		if (rootName != w.root.toLowerCase()) {
			if (rootName == 'events') {
				fm.loadSchema('xml/orlando_common_and_events_schema.xml', false, processDocument);
			} else {
				fm.loadSchema('xml/CWRCBasicTEI.xml', false, processDocument);
			}
		} else {
			processDocument();
		}
		
		function processDocument() {
			var offsets = [];
			var maxId = 0; // track what the largest id num is
			
			var rdfs = $(doc).find('rdf\\:RDF, RDF');
			
			var docMode;
			if (rdfs.length > 0) {
				docMode = w.XMLRDF;
			} else {
				docMode = w.XML;
			}
			
			if (w.mode != docMode) {
				var editorModeStr = w.mode == w.XML ? 'XML only' : 'XML & RDF';
				var docModeStr = docMode == w.XML ? 'XML only' : 'XML & RDF';
				w.d.show('message', {
					title: 'Warning',
					msg: 'The Editor Mode ('+editorModeStr+') has been changed to match the Document Mode ('+docModeStr+').'
				});
				
				w.mode = docMode;
			}
			
			if (docMode == w.XMLRDF) {
				rdfs.children().each(function(i1, el1) {
					// entity
					if ($(this).attr('rdf:ID')) {
						var id = $(this).find('w\\:id, id').text();
						
						var idNum = parseInt(id.split('_')[1]);
						if (idNum > maxId) maxId = idNum;
						
						offsets.push({
							id: id,
							parent: $(this).find('w\\:parent, parent').text(),
							offset: parseInt($(this).find('w\\:offset, offset').text()),
							length: parseInt($(this).find('w\\:length, length').text())
						});
						w.entities[id] = {
							props: {
								id: id
							},
							info: {}
						};
						$(this).children('[type="props"]').each(function(i2, el2) {
							var key = $(this)[0].nodeName.split(':')[1].toLowerCase();
							if (key == 'content') {
								var title = w.getTitleFromContent($(this).text());
								w.entities[id]['props']['title'] = title;
							}
							w.entities[id]['props'][key] = $(this).text();
						});
						$(this).children('[type="info"]').each(function(i2, el2) {
							var key = $(this)[0].nodeName.split(':')[1].toLowerCase();
							w.entities[id]['info'][key] = $(this).text();
						});
						
					// triple
					} else {
						var subject = $(this);
						var subjectUri = subject.attr('rdf:about');
						var predicate = $(this).children().first();
						var object = $(this).find('rdf\\:Description, Description');
						var objectUri = object.attr('rdf:about');
						
						var triple = {
							subject: {
								uri: subjectUri,
								text: subject.attr('w:external') == 'false' ? w.entities[subjectUri].props.title : subjectUri,
								external: subject.attr('w:external, external')
							},
							predicate: {
								text: predicate.attr('w:text'),
								name: predicate[0].nodeName.split(':')[1].toLowerCase(),
								external: predicate.attr('w:external')
							},
							object: {
								uri: objectUri,
								text: object.attr('w:external') == 'false' ? w.entities[objectUri].props.title : objectUri,
								external: object.attr('w:external')
							}
						};
						
						w.triples.push(triple);
					}
				});
				$(doc).find('rdf\\:RDF, RDF').remove();
			} else {
				_getNodeOffsets($(doc.body), offsets);
				
				var entsQuery = '';
				for (var key in w.titles) {
					entsQuery += key+',';
				}
				entsQuery = entsQuery.substr(0, entsQuery.length-1);
				var ents = $(doc).find(entsQuery);
				ents.each(function(index, el) {
					var ent = $(el);
					var id = ent.attr('id');
					var content = ent.text();
					w.entities[id] = {
						props: {
							id: id,
							type: el.nodeName.toLowerCase(),
							content: content,
							title: w.getTitleFromContent(content)
						},
						info: {}
					};
					$(el.attributes).each(function(index, att) {
						w.entities[id].info[att.name] = att.value;
					});
					
					ent.contents().unwrap();
				});
			}
			
			var editorString = '';
			
			function buildEditorString(currentNode) {
				var tag = currentNode.nodeName;
				if (tag == w.root) {
					editorString += '<'+tag.toLowerCase();
				} else {
					editorString += '<span';
				}
				editorString += ' _struct="true" _tag="'+tag+'"';
				$(currentNode.attributes).each(function(index, att) {
					var attName = att.name;
					if (attName == idName) attName = 'id';
					editorString += ' '+attName+'="'+att.value+'"';
				});
				editorString += '>';
				
				$(currentNode).contents().each(function(index, el) {
					if (el.nodeType == 1) {
						buildEditorString(el);
					} else if (el.nodeType == 3) {
						editorString += el.data;
					}
				});
				
				if (tag == w.root) {
					editorString += '</'+tag.toLowerCase()+'>';
				} else {
					editorString += '</span>';
				}
			}
			
			var root = doc.getElementsByTagName(w.root)[0];
			buildEditorString(root);
//			console.log(editorString);
			w.editor.setContent(editorString);
			
			var id, o, range, parent, contents, lengthCount, match, startOffset, endOffset, startNode, endNode;
			for (var i = 0; i < offsets.length; i++) {
				o = offsets[i];
				id = o.id;
				parent = w.editor.$('#'+o.parent);
				
				// get all text nodes
				contents = parent.contents().filter(function() {
					return this.nodeType == Node.TEXT_NODE;
				});
				
				startOffset = o.offset;
				lengthCount = 0;
				match = false;
				startNode = contents.filter(function() {
					if (!match) {
						lengthCount += this.length;
						if (lengthCount > o.offset) {
							match = true;
							return true;
						} else {
							startOffset -= this.length;
						}
					}
					return false;
				})[0];
				
				endOffset = o.offset+o.length;
				lengthCount = 0;
				match = false;
				endNode = contents.filter(function() {
					if (!match) {
						lengthCount += this.length;
						if (lengthCount >= o.offset+o.length) {
							match = true;
							return true;
						} else {
							endOffset -= this.length;
						}
					}
					return false;
				})[0];
				
				range = w.editor.selection.getRng(true);
				range.setStart(startNode, startOffset);
				range.setEnd(endNode, endOffset);
				w.insertBoundaryTags(id, w.entities[id].props.type, range);
			}
			
			w.editor.$(w.editor.getBody()).find('[_struct]').each(function(index, element) {
				var id = this.getAttribute('id');
				
				// if id is null, an empty paragraph snuck in. it'll be dealt with when the structure tree gets updated.
				if (id != null) {
					var idNum = parseInt(id.split('_')[1]);
					if (idNum > maxId) maxId = idNum;
					
					w.structs[id] = {};
					for (var i = 0; i < this.attributes.length; i++) {
						var key = this.attributes[i].nodeName;
						var value = this.attributes[i].nodeValue;
						w.structs[id][key] = value;
					}
				}
			});
			
			// set the id counter so we don't get duplicate ids
			tinymce.DOM.counter = maxId+1;
			
			w.entitiesList.update();
			w.tree.update(true);
			w.relations.update();
		}
	};
	
	fm.editSource = function() {
		var docText = _exportDocument(true);
		$('textarea', edit).val(docText);
		edit.dialog('open');
	};
	

	fm.xmlToString = function(xmlData) {
		var xmlString = '';
		try {
			if (window.ActiveXObject) {
				xmlString = xmlData.xml;
			} else {
				xmlString = (new XMLSerializer()).serializeToString(xmlData);
			}
		} catch (e) {
			alert(e);
		}
		return xmlString;
	};
	
	/**
	 * Load a new schema.
	 * @param {String} url The url of the schema to load
	 * @param {Boolean} startText Whether to include the default starting text
	 * @param {Function} callback Callback for when the load is complete
	 */
	fm.loadSchema = function(url, startText, callback) {
		$.ajax({
			url: url,
			success: function(data, status, xhr) {
				w.schemaXML = data;
				
				var root = $('start', w.schemaXML).find('ref, element').first();
				var rootName = root.attr('name');
				if (root.is('element')) {
					w.root = rootName;
				} else {
					w.root = $('define[name="'+rootName+'"]', w.schemaXML).find('element').first().attr('name');
				}
				w.editor.settings.forced_root_block = w.root;
				w.editor.schema.addCustomElements(w.root);
			    w.editor.schema.addCustomElements(w.root.toLowerCase());
			    
			    var cssUrl;
			    if (w.root.toLowerCase() == 'events') {
			    	cssUrl = 'css/orlando.css';
			    	w.validationSchema = 'events';
			    } else {
			    	cssUrl = 'css/tei.css';
			    	w.validationSchema = 'cwrcbasic';
			    }
			    fm.loadSchemaCSS(cssUrl);
			    
			    // create css to display schema tags
				$('#schemaTags', w.editor.dom.doc).remove();
				$('head', w.editor.dom.doc).append('<style id="schemaTags" type="text/css" />');
				var tag = w.root;
				// xhtml only allows lower case elements
				var schemaTags = w.root.toLowerCase()+' { display: block; }';
				schemaTags += '.showStructBrackets '+w.root.toLowerCase()+':before { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "<'+tag+'>"; }';
				schemaTags += '.showStructBrackets '+w.root.toLowerCase()+':after { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "</'+tag+'>"; }';
				var elements = [];
				$('element', w.schemaXML).each(function(index, el) {
					var tag = $(el).attr('name');
					if (elements.indexOf(tag) == -1) {
						elements.push(tag);
						schemaTags += '.showStructBrackets span[_tag='+tag+']:before { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "<'+tag+'>"; }';
						schemaTags += '.showStructBrackets span[_tag='+tag+']:after { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "</'+tag+'>"; }';
					}
				});
				$('#schemaTags', w.editor.dom.doc).text(schemaTags);
			    
				w.schema.elements = elements;
				
				var text = '';
				if (startText) text = 'Paste or type your text here.';
				w.editor.setContent('<'+w.root+' _tag="'+w.root+'">'+text+'</'+w.root+'>');
				
				w.entitiesList.update();
				w.tree.update(true);
				w.relations.update();
				
				if (callback) callback();
			},
			error: function(xhr, status, error) {
				w.d.show('message', {title: 'Error', msg: 'Error loading schema: '+error});
			}
		});
	};
	
	fm.loadSchemaCSS = function(url) {
		w.editor.dom.loadCSS(url);
		var name = url.split('/');
		name = name[name.length-1];
		var numCss = w.editor.getDoc().styleSheets.length;
		var cssInt = null;
		function parseCss() {
			var stylesheet = null;
			var stylesheets = w.editor.getDoc().styleSheets;
			for (var i = 0; i < stylesheets.length; i++) {
				var s = stylesheets[i];
				if (s.href.indexOf(name) != -1) {
					stylesheet = s;
					break;
				}
			}
			if (stylesheet) {
				try {
					var rules = stylesheet.cssRules;
					var newRules = '';
					// adapt the rules to our format, should only modify element names in selectors
					for (var i = 0; i < rules.length; i++) {
						var selector = rules[i].selectorText;
						var newSelector = selector.replace(/(^|,|\s)(\w+)/g, function(str, p1, p2, offset, s) {
							return p1+'span[_tag="'+p2+'"]';
						});
						var css = rules[i].cssText;
						var newCss = css.replace(selector, newSelector);
						newRules += newCss+'\n';
					}
					
					var doc = w.editor.getDoc();
					var styleEl = doc.createElement('style');
					var styleType = doc.createAttribute('type');
					styleType.value = 'text/css';
					styleEl.setAttributeNode(styleType);
					var styleText = doc.createTextNode(newRules);
					styleEl.appendChild(styleText);
					doc.head.appendChild(styleEl);
					stylesheet.disabled = true;
				} catch (e) {
					setTimeout(parseCss, 25);
				}
			} else {
				setTimeout(parseCss, 25);
			}
		};
		if (numCss > 0) {
			parseCss();
		} else {
			cssInt = setInterval(function() {
				var len = w.editor.getDoc().styleSheets.length;
				if (len > numCss) {
					clearInterval(cssInt);
					parseCss();
				}
			}, 25);
		}
	};
	
	fm.loadInitialDocument = function(start) {
		if (start.match('load')) {
			fm.openLoader();
		} else if (start == '') {
			fm.loadSchema('xml/CWRCBasicTEI.xml', true);
		} else if (start.match('event')) {
			_loadTemplate('xml/event_template.xml');
		} else if (start.match('letter')) {
			_loadTemplate('xml/letter_template.xml');
		} else if (start.match('sample')) {
			_loadTemplate('xml/sample_letter.xml');
		}
	};
	
	var _loadTemplate = function(url) {
		$.ajax({
			url: url,
			dataType: 'xml',
			success: function(data, status, xhr) {
				var rdf = data.createElement('rdf:RDF');
				$(data.firstChild).prepend(rdf);
				_loadDocumentHandler(data);
			}
		});
	};
	
	return fm;
};

//cross browser xml node finder
//http://www.steveworkman.com/html5-2/javascript/2011/improving-javascript-xml-node-finding-performance-by-2000/
$.fn.filterNode = function(name) {
	return this.find('*').filter(function() {
		return this.nodeName === name;
	});
};