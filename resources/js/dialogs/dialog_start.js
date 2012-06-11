var StartDialog = function(config) {
	var w = config.writer;
	
	$(document.body).append(''+
		'<div id="startDialog"><div class="buttonsParent">'+
			'<button>Load an Existing Document</button>'+
			'<button>Start a CWRC-TEI Document</button>'+
			'<button>Start a CWRC-EVENTS Document</button>'+
			'<button>Create a Letter with CWRC-TEI</button>'+
		'</div></div>');
	
	var start = $('#startDialog');
	start.dialog({
		title: 'CWRCWriter Starting Choices',
		modal: true,
		resizable: false,
		closeOnEscape: false,
		position: 'center',
		open: function(event, ui) {
			$('#startDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 255,
		width: 340,
		autoOpen: false
	});
	
	var buttons = $('#startDialog button').button();
	buttons.eq(0).click(function() {
		start.dialog('close');
		w.fm.openLoader();
	});
	buttons.eq(1).click(function() {
		start.dialog('close');
		w.loadSchema('js/cwrc_basic_tei.js');
		w.validationSchema = 'common';
	});
	buttons.eq(2).click(function() {
		start.dialog('close');
		w.loadSchema('js/common_events_schema.js');
		w.validationSchema = 'events';
	});
	buttons.eq(3).click(function() {
		start.dialog('close');
		w.validationSchema = 'common';
		w.loadSchema('js/cwrc_basic_tei.js', function() {
			function loadLetter(xml, xsl) {
				var doc;
				if (window.ActiveXObject) {
					doc = xml.transformNode(xsl);
				} else {
					var xsltProcessor = new XSLTProcessor();
					xsltProcessor.importStylesheet(xsl);
					doc = xsltProcessor.transformToDocument(xml);
				}
				var xmlString = '';
				try {
					if (window.ActiveXObject) {
						xmlString = doc;
					} else {
						xmlString = (new XMLSerializer()).serializeToString(doc.firstChild);
					}
				} catch (e) {
					alert(e);
				}
				w.editor.setContent(xmlString);
				
				w.entitiesList.update();
				w.tree.update(true);
				w.relations.update();
			}
			
			var xml, xsl = null;
			$.ajax({
				url: 'xml/letter_template.xml',
				success: function(data, status, xhr) {
					xml = data;
					if (xsl != null) loadLetter(xml, xsl);
				}
			});
			$.ajax({
				url: 'xml/doc2internal.xsl',
				success: function(data, status, xhr) {
					xsl = data;
					if (xml != null) loadLetter(xml, xsl); 
				}
			});
		});
	});
	
	return {
		show: function(config) {
			start.dialog('option', 'position', 'center');
			start.dialog('open');
		},
		hide: function() {
			start.dialog('close');
		}
	};
};