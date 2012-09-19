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
						msg: 'You may only enter upper or lowercase letters; no numbers, spaces, or punctuation.',
						type: 'error'
					});
					return;
				} else if (name == 'info') {
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'This name is reserved, please choose a different one.',
						type: 'error'
					});
					return;
				}
				
				if ($.inArray(name, docNames) != -1) {
					// TODO add overwrite confirmation
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'This name already exists, please choose a different one.',
						type: 'error'
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
				// TODO can't get doc by setting string in iframe as it doesn't preserve xml properties
//				var newDocString = $('textarea', edit).val();
//				$('#editDocLoader').contents().find('html').html(newDocString);
//				w.entities = {};
//				w.structs = {};
//				_loadDocumentHandler($('#editDocLoader').contents()[0]);
				w.d.show('message', {
					title: 'Edit Source',
					msg: 'Edit Source does not currently modify the underlying document.',
					type: 'info'
				});
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
				w.d.show('message', {
					title: 'Error',
					msg: 'Error getting documents.',
					type: 'error'
				});
//				$.ajax({
//					url: 'xml/test.xml',
//					success: function(data, status, xhr) {
//						_loadDocumentHandler(data);
//					}
//				});
			}
		});
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
					msg: 'An error occurred while trying to validate '+currentDoc+'.',
					type: 'error'
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
					msg: doc+' is not valid.<br/>'+errors,
					type: 'error'
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
					msg: doc+' is valid.<br/>'+warnings,
					type: 'info'
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
						msg: 'An error occurred and '+currentDoc+' was not saved.',
						type: 'error'
					});
				}
			});
		}
	};
	
	var _exportDocument = function(includeRDF) {
		// remove highlights
		w.highlightEntity();
		
		var idName = w.validationSchema == 'cwrcbasic' ? 'xml:id' : 'ID';
		
		var xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
		
		var body = $(w.editor.getDoc().body);
		var clone = body.clone(false, true); // make a copy, don't clone body events, but clone child events
		
		var offsets = _getNodeOffsetsFromRoot(body);
		
		_entitiesToUnicode(body);
		
		function nodeToStringArray(node) {
			var array = [];
			var id = node.attr('id');
			var tag = node.attr('_tag') || node.attr('_type');
			
			var openingTag = '<'+tag;
			
			var structEntry = w.structs[id];
			var entityEntry = w.entities[id];
			if (structEntry) {
				for (var key in structEntry) {
					if (key.indexOf('_') != 0) {
						var attName = key;
						if (attName == 'id') attName = idName;
						openingTag += ' '+attName+'="'+structEntry[key]+'"';
					}
				}
			} else if (entityEntry) {
				for (var key in entityEntry.info) {
					openingTag += ' '+key+'="'+entityEntry.info[key]+'"';
				}
			}
			
			openingTag += '>';
			array.push(openingTag);
			array.push('</'+tag+'>');
			
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
		
		// rdf
		var rdfString = '';
		if (includeRDF) {
			rdfString = '\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:w="http://cwrctc.artsrn.ualberta.ca/#">';
			
			// xml mode
			var uri = w.baseUrl+'editor/documents/'+currentDoc;
			rdfString += '\n<rdf:Description rdf:about="'+uri+'">\n\t<w:mode>'+w.mode+'</w:mode>\n</rdf:Description>';
			
			for (var i = 0; i < offsets.length; i++) {
				var o = offsets[i];
				rdfString += '\n<rdf:Description rdf:ID="'+o.id+'">';
				var key;
				for (key in o) {
					rdfString += '\n\t<w:'+key+' type="offset">'+o[key]+'</w:'+key+'>';
				}
				if (o.entity) {
					var entry = w.entities[o.id];
					rdfString += '\n\t<w:type type="props">'+entry.props.type+'</w:type>';
					rdfString += '\n\t<w:content type="props">'+entry.props.content+'</w:content>';
					for (key in entry.info) {
						rdfString += '\n\t<w:'+key+' type="info">'+entry.info[key]+'</w:'+key+'>';
					}
				}
				rdfString += '\n</rdf:Description>';
			}
			
			// triples
			for (var i = 0; i < w.triples.length; i++) {
				var t = w.triples[i];
				rdfString += '\n<rdf:Description rdf:about="'+t.subject.uri+'" w:external="'+t.subject.external+'">'+
				'\n\t<w:'+t.predicate.name+' w:text="'+t.predicate.text+'" w:external="'+t.predicate.external+'">'+
				'\n\t\t<rdf:Description rdf:about="'+t.object.uri+'" w:external="'+t.object.external+'" />'+
				'\n\t</w:'+t.predicate.name+'>'+
				'\n</rdf:Description>';
			}
			
			rdfString += '\n</rdf:RDF>\n';
		}
		
		if (w.mode == w.XMLRDF) {
			if (includeRDF) body.find('[_entity]').remove();
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
				
				w.editor.$(nodes).wrapAll('<entity'+attributes+'/>');
				w.editor.$(markers).remove();
			}
		}
		
		var root = body.children(w.root);
		// make sure TEI has the right namespace for validation purposes
		if (w.root == 'TEI') {
			root.attr('xmlns','http://www.tei-c.org/ns/1.0');
		}
		var tags = nodeToStringArray(root);
		xmlString += tags[0];
		
		xmlString += rdfString;
		
		root.contents().each(function(index, el) {
			if (el.nodeType == 1) {
				buildXMLString($(el));
			} else if (el.nodeType == 3) {
				xmlString += el.data;
			}
		});
		
		xmlString += tags[1];
		
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
	
	var _getNodeOffsetsFromRoot = function(root) {
		var currentOffset = 0;
		var offsets = [];
		function getOffsets(parent) {
			parent.contents().each(function(index, element) {
				var el = $(this);
				if (this.nodeType == Node.TEXT_NODE && this.data != ' ') {
					currentOffset += this.length;
				} else if (el.is(w.root) || el.attr('_tag')) {
					var id = el.attr('id');
					offsets.push({
						id: id,
						offset: currentOffset,
						length: el.text().length
					});
					getOffsets(el);
				} else if (el.attr('_entity') && el.hasClass('start')) {
					var id = el.attr('name');
					offsets.push({
						id: id,
						offset: currentOffset,
						length: w.entities[id].props.content.length,
						entity: true
					});
				}
			});
		}
		
		getOffsets(root);
		return offsets;
	};
	
	fm.loadDocumentFromUrl = function(docUrl) {
		currentDoc = docUrl;
		
		w.entities = {};
		w.structs = {};
		w.triples = [];
		
		$.ajax({
			url: docUrl,
			type: 'GET',
			success: _loadDocumentHandler,
			error: function(xhr, status, error) {
				currentDoc = null;
				w.d.show('message', {
					title: 'Error',
					msg: 'An error ('+status+') occurred and '+docUrl+' was not loaded.',
					type: 'error'
				});
			},
			dataType: 'xml'
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
					msg: 'An error ('+status+') occurred and '+docName+' was not loaded.',
					type: 'error'
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
			idName = 'ID';
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
			var mode = parseInt(rdfs.find('w\\:mode, mode').first().text());
			if (mode == w.XML) {
				docMode = w.XML;
			} else {
				docMode = w.XMLRDF;
			}
			
			if (w.mode != docMode) {
				var editorModeStr = w.mode == w.XML ? 'XML only' : 'XML & RDF';
				var docModeStr = docMode == w.XML ? 'XML only' : 'XML & RDF';
				w.d.show('message', {
					title: 'Editor Mode changed',
					msg: 'The Editor Mode ('+editorModeStr+') has been changed to match the Document Mode ('+docModeStr+').',
					type: 'info'
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
				function processEntities(parent, idName, offsets) {
					var currentOffset = 0;
					parent.contents().each(function(index, element) {
						if (this.nodeType == Node.TEXT_NODE) {
							currentOffset += this.length;
						} else if (w.titles[this.nodeName.toLowerCase()] != null) {
							var ent = $(this);
							var id = ent.attr(idName);
							if (id == null) {
								id = tinymce.DOM.uniqueId('ent_');
							}
							offsets.push({
								id: id,
								parent: $(parent).attr(idName),
								offset: currentOffset,
								length: ent.text().length
							});
							
							var content = ent.text();
							w.entities[id] = {
								props: {
									id: id,
									type: this.nodeName.toLowerCase(),
									content: content,
									title: w.getTitleFromContent(content)
								},
								info: {}
							};
							$(this.attributes).each(function(index, att) {
								w.entities[id].info[att.name] = att.value;
							});
							
							ent.contents().unwrap();
						} else {
							processEntities($(this), idName, offsets);
						}
					});
				}
				processEntities($(doc.firstChild), idName, offsets);
			}
			
			var editorString = '';
			
			function buildEditorString(currentNode) {
				var tag = currentNode.nodeName;
				if (tag == w.root) {
					editorString += '<'+tag.toLowerCase();
				} else {
					editorString += '<span';
				}
				editorString += ' _tag="'+tag+'"';
				
				// create structs entries while we build the string
				var id = $(currentNode).attr(idName);
				if (id == null) {
					id = tinymce.DOM.uniqueId('struct_');
					editorString += ' id="'+id+'"';
				}
				var idNum = parseInt(id.split('_')[1]);
				if (idNum > maxId) maxId = idNum;
				
				w.structs[id] = {
					id: id,
					_tag: tag
				};
				$(currentNode.attributes).each(function(index, att) {
					var attName = att.name;
					if (attName == idName) attName = 'id';
					w.structs[id][attName] = att.value;
					if (attName == 'id' || attName.match(/^_/) != null) {
						editorString += ' '+attName+'="'+att.value+'"';
					}
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
			w.editor.setContent(editorString);
			
			// editor needs focus in order for entities to be properly inserted
			w.editor.focus();
			
			var id, o, parent, contents, lengthCount, match, startOffset, endOffset, startNode, endNode;
			for (var i = 0; i < offsets.length; i++) {
				startNode = null;
				endNode = null;
				startOffset = 0;
				endOffset = 0;
				
				o = offsets[i];
				id = o.id;
				if (o.parent != '') {
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
				} else {
					parent = $(w.editor.getDoc().body);
					var currentOffset = 0;
					function getNodes(parent) {
						parent.contents().each(function(index, element) {
							if (this.nodeType == Node.TEXT_NODE && this.data != ' ') {
								currentOffset += this.length;
								
								if (currentOffset > o.offset && startNode == null) {
									startNode = this;
									startOffset = o.offset - (currentOffset - this.length);
								}
								
								if (currentOffset >= o.offset + o.length && endNode == null) {
									endNode = this;
									endOffset = startOffset + o.length;
								}
							} else {//if ($(this).is(w.root) || $(this).attr('_tag')) {
								getNodes($(this));
							}
							if (startNode != null && endNode != null) {
								return false;
							}
						});
					}
					
					getNodes(parent);
				}
				
				if (startNode != null && endNode != null) {
					var range = w.editor.selection.getRng(true);
					range.setStart(startNode, startOffset);
					range.setEnd(endNode, endOffset);
					w.insertBoundaryTags(id, w.entities[id].props.type, range);
				}
			}
			
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
			    	w.header = 'ORLANDOHEADER';
			    } else {
			    	cssUrl = 'css/tei.css';
			    	w.validationSchema = 'cwrcbasic';
			    	w.header = 'teiHeader';
			    }
			    
			    $('#schemaTags', w.editor.dom.doc).remove();
			    $('#schemaRules', w.editor.dom.doc).remove();
			    fm.loadSchemaCSS(cssUrl);
			    
			    // create css to display schema tags
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
				// hide the header
				schemaTags += 'span[_tag='+w.header+'] { display: none !important; }';
				
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
				w.d.show('message', {title: 'Error', msg: 'Error loading schema: '+error, type: 'error'});
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
				if (s.href && s.href.indexOf(name) != -1) {
					stylesheet = s;
					break;
				}
			}
			if (stylesheet) {
				try {
					$('#schemaRules', w.editor.dom.doc).remove();
					
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
					$('head', w.editor.dom.doc).append('<style id="schemaRules" type="text/css" />');
					$('#schemaRules', w.editor.dom.doc).text(newRules);
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
		} else if (start.match('sample_letter')) {
			_loadTemplate('xml/sample_letter.xml');
		} else if (start.match('sample_poem')) {
			_loadTemplate('xml/sample_poem.xml');
		} else if (start.match('event')) {
			_loadTemplate('xml/event_template.xml');
		} else if (start.match('letter')) {
			_loadTemplate('xml/letter_template.xml');
		} else if (start.match('poem')) {
			_loadTemplate('xml/poem_template.xml');
		} else if (start.match('prose')) {
			_loadTemplate('xml/prose_template.xml');
		} else {
			fm.loadSchema('xml/CWRCBasicTEI.xml', true);
		}
	};
	
	var _loadTemplate = function(url) {
		$.ajax({
			url: url,
			dataType: 'xml',
			success: function(data, status, xhr) {
				var rdf = data.createElement('rdf:RDF');
				var root;
				if (data.childNodes) {
					root = data.childNodes[data.childNodes.length-1];
				} else {
					root = data.firstChild;
				}
				$(root).prepend(rdf);
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