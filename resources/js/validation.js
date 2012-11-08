var Validation = function(config) {
	
	var w = config.writer;
	
	var id = config.parentId;
	
	var validation = {};
	
	/**
	 * Processes a validation response from the server.
	 * @param resultDoc The actual response
	 * @param docString The doc string sent to the server for validation  
	 */
	validation.showValidationResult = function(resultDoc, docString) {
		var container = $(id);
		container.empty().append('<ul class="validationList"></ul>');
		var list = container.find('ul');
		
		docString = docString.split('\n')[1]; // remove the xml header
		
		var status = $('status', resultDoc).text();
		
		if (status == 'pass') {
			list.append(''+
				'<li class="ui-state-default">'+
					'<span class="ui-icon ui-icon-check" style="float: left; margin-right: 4px;"></span>Your document is valid!'+
				'</li>');
		}
		
		$('error, warning', resultDoc).each(function(index, el) {
			var type = el.nodeName;
			var id = '';
			var message = $(this).find('message').text();
			
			var column = parseInt($(this).find('column').text());
			if (!isNaN(column)) {
				var docSubstring = docString.substring(0, column);
				var tags = docSubstring.match(/<.*?>/g);
				var tag = tags[tags.length-1];
				id = tag.match(/id="(.*?)"/i)[1];
			}
			
			var item = list.append(''+
				'<li class="'+(type=='error'?'ui-state-error':'ui-state-highlight')+'">'+
					'<span class="ui-icon '+(type=='error'?'ui-icon-alert':'ui-icon-info')+'" style="float: left; margin-right: 4px;"></span>'+message+
				'</li>'
			).find('li:last');
			item.data('id', id);
		});
		
		list.find('li').click(function() {
			var id = $(this).data('id');
			if (id) {
				w.selectStructureTag(id);
			}
		});
		
		w.layout.center.children.layout1.open('south');
	};
	
	return validation;
};