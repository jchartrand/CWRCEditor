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
		'</div>'
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
				var name = filenameInput.value;
				
				if (!_isNameValid(name)) {
					w.d.showMessage({
						title: 'Invalid Name',
						msg: 'You may only enter upper or lowercase letters; no numbers, spaces, or punctuation.'
					});
					return;
				}
				
				if ($.inArray(name, docNames) != -1) {
					
				} else {
					currentDoc = name;
					fm.saveDocument();
					saver.dialog('close');
				}
			},
			'Cancel': function() {
				saver.dialog('close');
			}
		}
	});
	var filenameInput = $('#saver input')[0];
	
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
			url: 'http://cwrctc.artsrn.ualberta.ca/documents',
			type: 'GET',
			dataType: 'json',
			success: [function(data, status, xhr) {
				docNames = data.response;
			}, callback]
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
		});
	};
	
	var _isNameValid = function(name) {
		return name.match(/[^A-Za-z]+/) == null;
	};
	
	fm.saveDocument = function() {
		if (currentDoc == null) {
			fm.openSaver();
		} else {
			var docText = _exportDocument();
			$.ajax({
				url: 'http://cwrctc.artsrn.ualberta.ca/documents/'+currentDoc,
				type: 'PUT',
				dataType: 'json',
				data: docText,
				success: function(data, status, xhr) {
					w.d.showMessage({
						title: 'Document Saved',
						msg: currentDoc+' was saved successfully.'
					});
				}
			});
		}
	};
	
	var _exportDocument = function() {
		var offsets = [];
		var doc = w.editor.getDoc();
		var originalDoc = $(doc.body).clone(false, true); // make a copy, don't clone body events, but clone child events
		_processNodes($(doc.body), offsets);
		$(doc.body).find('entity').remove();
		var content = '<body>'+w.editor.getContent()+'</body></html>';
		var head = '<?xml version="1.0"?><html><head><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:w="http://cwrctc.artsrn.ualberta.ca/#">';
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
		head += '</rdf:RDF></head>';
		var exportText = head + content;
		$(doc.body).replaceWith(originalDoc);
		return exportText;
	};
	
	var _processNodes = function(parent, offsets) {
		var currentOffset = 0;
		parent.contents().each(function(index, element) {
			if (this.nodeType == 3) {
				currentOffset += this.length;
			} else if ($(this).is('struct, p')) {
				_processNodes($(this), offsets);
			} else if ($(this).is('entity[class*=start]')) {
				var id = $(this).attr('name');
				offsets.push({
					id: id,
					parent: $(parent).attr('id'),
					offset: currentOffset,
					length: w.entities[id].props.content.length
				});
			}
		});
	};
	
	fm.loadDocument = function(docName) {
		w.entities = {};
		w.structs = {};
		
		$.ajax({
			url: 'http://cwrctc.artsrn.ualberta.ca/documents/'+docName,
			type: 'GET',
			success: _loadDocumentHandler,
			dataType: 'xml'
		});
	};
	
	var _loadDocumentHandler = function(doc) {
		var offsets = {};
		
		var maxId = 0; // track what the largest id num is
		
		var rdfs = $(doc).find('[nodeName="rdf:RDF"]');
		rdfs.children().each(function(i1, el1) {
			var id = $(this).find('[nodeName="w:id"]').text();
			
			var idNum = parseInt(id.split('_')[1]);
			if (idNum > maxId) maxId = idNum;
			
			offsets[id] = {
				parent: $(this).find('[nodeName="w:parent"]').text(),
				offset: parseInt($(this).find('[nodeName="w:offset"]').text()),
				length: parseInt($(this).find('[nodeName="w:length"]').text())
			};
			w.entities[id] = {
				props: {
					id: id
				},
				info: {}
			};
			$(this).children('[type="props"]').each(function(i2, el2) {
				var key = $(this)[0].nodeName.split(':')[1];
				if (key == 'content') {
					var title = w.getTitleFromContent($(this).text());
					w.entities[id]['props']['title'] = title;
				}
				w.entities[id]['props'][key] = $(this).text();
			});
			$(this).children('[type="info"]').each(function(i2, el2) {
				var key = $(this)[0].nodeName.split(':')[1];
				w.entities[id]['info'][key] = $(this).text();
			});
		});
		
		var body = doc.getElementsByTagName('body')[0];
		var xmlString = '';
		try {
			if (window.ActiveXObject) {
				xmlString = body.xml;
			} else {
			   xmlString = (new XMLSerializer()).serializeToString(body);
			}
		} catch (e) {
			alert(e);
		}
		w.editor.setContent(xmlString);
		
		var id, o, range, contents, lengthCount, match, startOffset, endOffset, startNode, endNode;
		for (id in offsets) {
			// get all text nodes
			o = offsets[id];
			contents = w.editor.$('#'+o.parent).contents().filter(function() {
				return this.nodeType == 3;
			});
			
			startOffset = o.offset;
			lengthCount = 0;
			match = false;
			startNode = contents.filter(function() {
				if (!match) {
					lengthCount += this.length;
					if (lengthCount >= o.offset) {
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
		
		w.editor.$(w.editor.getBody()).find('p, struct').each(function(index, element) {
			var id = this.getAttribute('id');
			
			var idNum = parseInt(id.split('_')[1]);
			if (idNum > maxId) maxId = idNum;
			
			w.structs[id] = {};
			for (var i = 0; i < this.attributes.length; i++) {
				var key = this.attributes[i].nodeName;
				var value = this.attributes[i].nodeValue;
				w.structs[id][key] = value;
			}
		});
		
		// set the id counter so we don't get duplicate ids
		tinymce.DOM.counter = maxId+1;
		
		w.sp.updateEntitesList();
		w.sp.updateStructureTree(true);
	};
	
	return fm;
};