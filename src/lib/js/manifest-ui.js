class ManifestUI {
	constructor() { 
		this.interval = null;
		this.filter = {clear: true, term: null};
		
		document.getElementById('fullscreen-menu').addEventListener('click', (e) => { MI.Interface.ToggleFullscreen(); });
		document.getElementById('mapcapture').addEventListener('click', (e) => { MI.ExportManifest(null, document.title, 'map'); });
		document.querySelectorAll('#minfo, #minfo-hamburger').forEach(el => { el.addEventListener('click', (e) => { MI.Interface.ShowLauncher(); }); });
	
		// CHECK used to also assign mouseup to first below
		document.getElementById('searchbar').addEventListener('keyup', (e) => { MI.Interface.Search(); });
		document.getElementById('searchclear').addEventListener('click', (e) => { MI.Interface.ClearSearch(); MI.Interface.Search(); });	
	}
	
	/** Called after Manifest has been initialized and the first supply chain loaded **/ 
	CleanupInterface() { 	
		MI.initialized = true; console.log(MI); 
		document.getElementById('load-samples').addEventListener('change', function() {
			const selected = document.getElementById('load-samples').value;
		
			if (selected === 'url') { document.getElementById('loadlistpanel').className = 'url'; } 
			else if (selected === 'file') { document.getElementById('loadlistpanel').className = 'file'; } 
			else { document.getElementById('loadlistpanel').className = ''; }
		});
				
		document.getElementById('load-samples-btn').addEventListener('click', (e) => { MI.Interface.LoadFromLauncher(document.getElementById('load-samples').value); });	
		document.querySelectorAll('#basemap-chooser li').forEach(el => { el.addEventListener('click', (e) => { this.SetBasemap(el.classList[0]); }); });
		document.getElementById('viz-choices').addEventListener('change', (e) => { MI.Visualization.Set(document.getElementById('viz-choices').value); });
		document.querySelectorAll('.sources').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); }); });
	
		document.getElementById('measure-choices').addEventListener('change', (e) => { 
			MI.Atlas.MeasureSort(); MI.Visualization.Set(MI.Visualization.type); });
		document.getElementById('mapmenu').addEventListener('click', (e) => { document.getElementById('mapmenu-window').classList.remove('closed'); });
		document.getElementById('mapmenu-window').addEventListener('mouseleave', (e) => { document.getElementById('mapmenu-window').classList.add('closed'); });

		let dropElement = document.getElementById('minfodetail');
		let dropArea = new jsondrop('minfodetail', { 
			onEachFile: function(file, start) { MI.Process('manifest', file.data, {id: file.name.hashCode(), url: '', start:MI.supplychains.length === 0}); } 
		});	
		document.getElementById('file-input').addEventListener('change', (e) => { if (!MI.LoadManifestFile(e.target.files[0], e.target.value.split( '\\' ).pop())) { 
			this.ShakeAlert(document.getElementById('manifestbar'));
			// @TODO This should shake, but it mysteriously doesn't the function gets called but no animation (in Safari)
		}});
		if (MI.options.storyMap) { this.SetBasemap('light'); }
		
		['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(evt => dropElement.addEventListener(evt, (e) => { 
			e.preventDefault(); e.stopPropagation(); }));
		['dragover', 'dragenter'].forEach(evt => dropElement.addEventListener(evt, (e) => { dropElement.classList.add('is-dragover'); }));
		['dragleave', 'dragend', 'drop'].forEach(evt => dropElement.addEventListener(evt, (e) => { dropElement.classList.remove('is-dragover'); }));

		window.onresize = this.ManifestResize;	
		setTimeout(this.ClearLoader, 150);
	}
	
	Storyize() {
		document.body.classList.add('storymap');
		MI.Atlas.radius = 20;
	} 
	
	SetupStoryTrigger(selector){
		let els = document.querySelectorAll(selector);
		els = Array.from(els);
		els.forEach(el => {
  	    	let observer = new IntersectionObserver((entries, observer) => { 
				entries.forEach(entry => { if (entry.isIntersecting) { 
					MI.Atlas.PointFocus(entry.target.parentElement.id.split('_')[1], false, true);	
				}});
  	  	  	});
			observer.observe(el);
	  });
	}

	// Example usage
	
	/** Handles header actions **/
	ShowHeader(id) {
		let mheader = document.getElementById('mheader-'+id);
		let offset = mheader.clientHeight;

		while (mheader.previousSibling) {
			mheader = mheader.previousSibling;
			if (mheader.nodeType === 1 && mheader.classList.contains('mheader')) { offset += mheader.clientHeight; }
		}
		document.getElementById('sidepanel').scrollTo(0, document.getElementById('mdetails-'+id).offsetTop + (-1*offset)); 	
		if (MI.Visualization.type === 'textview') {
			document.getElementById('textview').scrollTo(0, document.getElementById('blob-'+id).offsetTop - ManifestUtilities.RemToPixels(1));
		}
	}

	/** Handles the Manifest information and loading menu **/
	ShowLauncher() {	
		document.getElementById('minfodetail').classList.toggle('closed');
		document.getElementById('manifestbar').classList.toggle('open');
	
		if (!MI.Interface.IsMobile()) {
			if (document.getElementById('manifestbar').classList.contains('open')) { 
				document.body.classList.add('launcher');
				document.getElementById('sidepanel').style.top = document.getElementById('manifestbar').offsetHeight + ManifestUtilities.RemToPixels(1) + 'px'; 
			} else { document.body.classList.remove('launcher'); document.getElementById('sidepanel').style.top = '4rem'; }
		}
	}

	LoadFromLauncher(value, close=true) {
		let unloaded = false, loadurl, id, type, idref;
	
		if (value === 'url') {
			loadurl = document.getElementById('load-samples-input').value;
			if (loadurl.toLowerCase().indexOf('https://raw.githubusercontent.com/hock/smapdata/master/data/') >= 0) {
				type = 'smap'; id = loadurl.substring(60).split('.')[0]; idref = id; loadurl = MI.options.serviceurl + '?type='+type+'&id=' + id;
			} else if (loadurl.toLowerCase().indexOf('https://docs.google.com/spreadsheets/d/') >= 0) {
				type = 'gsheet'; id = loadurl.substring(39).split('/')[0]; idref = id; loadurl = MI.options.serviceurl + '?type='+type+'&id=' + id; id = id.hashCode();
			} else {
				type = 'manifest'; idref = loadurl; id = loadurl.hashCode();
			}
				
		} else {
			let val = value ? value : document.getElementById('load-samples').value;
			let option = val.split('-');
			type = option[0];	
			option = [option.shift(), option.join('-')];
			id = option[1];
		
			if (type === 'smap') { loadurl = MI.options.serviceurl + '?type='+type+'&id=' + id; } 
			else if	(type === 'manifest') { loadurl = id; id = id.hashCode(); } 
			else if (type === 'gsheet') { loadurl = MI.options.serviceurl + '?type='+type+'&id=' + id; id = id.hashCode(); }	
		}
		
		for (let s in MI.supplychains) { if (MI.supplychains[s].details.id === id) { unloaded = true; }}
			
		if (!unloaded && id) {
			if (MI.Interface.IsMobile()) { for (let s in MI.supplychains) { MI.Supplychain.Remove(MI.supplychains[s].details.id); } }
			fetch(loadurl).then(r => r.json()).then(data => MI.Process(type, data, {id: id, idref: idref, url:loadurl, start:MI.supplychains.length === 0}));
			//$.getJSON(loadurl, function(d) { });				
			if (close) { MI.Interface.ShowLauncher(); }
		} else { this.ShakeAlert(document.getElementById('manifestbar')); }
	}
	
	/** A simple text match search **/
	Search(term) {
		if (term) { document.getElementById('searchbar').value = term; }
		let s = document.getElementById('searchbar').value.toLowerCase();
		
		// Only do something if the search has changed.
		if (s !== MI.Interface.filter.term) {MI.Interface.filter.clear = false; }
		if (MI.Interface.filter.clear) { MI.Atlas.UpdateCluster(s); return; } else { MI.Interface.filter.term = s;}
		
		let closedcats = [];
		document.querySelectorAll('#supplycategories .supplycat input').forEach(el => { if (!el.checked) { closedcats.push(el.value); }});
	
		if (!MI.Interface.filter.clear) {		
			document.querySelectorAll('.mlist > li').forEach(el => { 
				let cats = el.querySelectorAll('.cat-link'), catcount = 0;
				for (let cc of closedcats) { for (let cat of cats) { cat = cat.dataset.cat.toLowerCase(); if (cc === cat) { catcount++; } } }

				let uncat = 'cat-'+el.parentElement.id.split('-')[1]+'-';
				//console.log(uncat);
				//console.log(closedcats);
			
				if ( catcount >= cats.length || el.textContent.toLowerCase().indexOf(MI.Interface.filter.term) === -1 || closedcats.includes(uncat+'uncategorized') && cats.length === 1 && cats[0].dataset.cat === uncat) { el.style.display = 'none'; } 
					else { el.style.display = 'list-item'; }
		    });
			MI.Interface.filter.clear = true;
		}

		let found = false;
		for (let i in MI.Atlas.map._layers) {
			if (typeof MI.Atlas.map._layers[i].feature !== 'undefined') {
				found = false;
				
				let cats = MI.Atlas.map._layers[i].feature.properties.category.split(','), catmatch = false, catcount = 0, 
					catid = MI.Atlas.map._layers[i].feature.properties.scid ? MI.Atlas.map._layers[i].feature.properties.scid : null;
				for (let cc of closedcats) { for (let cat of cats) { if (cc === 'cat-'+catid+'-'+cat) { catcount++; } } }
				//console.log(closedcats.includes('uncategorized'));
				//console.log(cats);
		        if (catcount >= cats.length) { found = false; }
				else {
					for (let k of ['title','description','category','placename']) {
						if (String(MI.Atlas.map._layers[i].feature.properties[k]).toLowerCase().indexOf(s) !== -1) { found = true; }
					}
				}
				
			
				console.log('----');
				let uncat = 'cat-'+catid+'-';
				console.log('cat-'+catid+'-'+cats[0] + ' vs ' + uncat);
				
				if (closedcats.includes(uncat+'uncategorized') && cats.length === 1 && 'cat-'+catid+'-'+cats[0] === uncat) {
					found = false;
				}
				// TODO Ideally we hide lines if one of the nodes isn't present... for categories this is more complicated and probably requires some changes to the line feature structure to store more information about its connected nodes.
			
				if (!(found)) { 
					MI.Atlas.map._layers[i].feature.properties.hidden = true;
					if (MI.Atlas.active_point && MI.Visualization.type === 'map') {
						if (MI.Atlas.active_point._popup._source._leaflet_id === MI.Atlas.map._layers[i]._leaflet_id) {
							if (MI.Atlas.active_point._popup._source.feature.properties.clustered.length === 0) { MI.Atlas.active_point.closePopup(); } 
							else {				
								let id = MI.Atlas.active_point._popup._source.feature.properties.lid;
								let next = document.getElementById('popup-'+id).nextElementSibling;
								while (next) { if (next.classList.contains('clusterbox')) break; next = next.nextElementSibling; }
								if (next) { MI.Atlas.PointFocus(next.id.split('-')[1]);} 
							}
						}
					}
				} else { MI.Atlas.map._layers[i].feature.properties.hidden = false; }
			} 
		}	
		// Check Lines
		for (let i in MI.Atlas.map._layers) {
			if (typeof MI.Atlas.map._layers[i].feature !== 'undefined') {
				if (MI.Atlas.map._layers[i].feature.properties.connections) {
					if (MI.Atlas.map._layers[i].feature.properties.connections.from.properties.hidden === true ||
						MI.Atlas.map._layers[i].feature.properties.connections.to.properties.hidden === true) {
							MI.Atlas.map._layers[i].feature.properties.hidden = true;
					}
				}
			}
		}
		if (MI.Visualization.type === 'map' && MI.Atlas.map._renderer) {  MI.Atlas.UpdateCluster(s); MI.Atlas.Refresh(); } else { MI.Visualization.Update(); }
	}

	ClearSearch() {
		document.getElementById('searchbar').value = ''; 
		MI.Interface.filter = {term: null, clear: true};
	}
	
	Link(link, event) {
		event.preventDefault(); event.stopPropagation();
		this.LoadFromLauncher(link.replace('manifest://', 'manifest-https://'), false);
	}
	
	/** Handles the measure sorting interface **/
	RefreshMeasureList() {
		const measurechoices = document.getElementById('measure-choices');
		let choices = {none:'none'};
		let previous = document.getElementById('measure-choices').value;

		for (let s in MI.supplychains) { for (let m in MI.supplychains[s].details.measures) { choices[m] = m; }}
	    while (measurechoices.firstChild) { measurechoices.removeChild(measurechoices.lastChild); }
	
		for (let c in choices) { let option = document.createElement('option'); option.value = c; option.textContent = c; measurechoices.append(option); }
		Array.from(document.querySelectorAll('#measure-choices option')).forEach((el) => { if (el.value === previous) { measurechoices.value = previous; } });
	}

	SetBasemap(tile) {
		const previoustiles = document.getElementById('basemap-preview').classList[0];
	
		document.getElementById('basemap-preview').classList.remove(...document.getElementById('basemap-preview').classList);	
		document.getElementById('basemap-preview').classList.add(tile);
	
		MI.Atlas.map.removeLayer(MI.Atlas.layerdefs[previoustiles]);
		MI.Atlas.map.addLayer(MI.Atlas.layerdefs[tile]);	
	
		document.querySelectorAll('#datalayers input').forEach(el => { 
			MI.Atlas.map.removeLayer(MI.Atlas.layerdefs[el.value]);
			if (el.checked) { MI.Atlas.map.addLayer(MI.Atlas.layerdefs[el.value]); }
		});
	}
	
	/** Sets interface to full screen mode **/
	ToggleFullscreen() {
		if (document.body.classList.contains('fullscreen')) {
			document.body.classList.remove('fullscreen');
			if (document.getElementsByClassName('leaflet-popup').length >= 1 && MI.Atlas.active_point !== null) { 
				MI.Atlas.map.setView(MI.Atlas.GetOffsetLatlng( MI.Atlas.active_point._popup._latlng));				
			}
		} else { document.body.classList.add('fullscreen'); }
		MI.Visualization.Resize();
	}
	
	SetDocumentTitle() {
		let scTitles = [], setTitle = '';
		for (let sc of MI.supplychains) { scTitles.push(sc.properties.title); }
		
		if (scTitles.length === 1 && scTitles[0] === 'Manifest') { setTitle = 'Manifest'; } 
		else { setTitle = scTitles.length > 0 ? scTitles.join(' + ') + ' - Manifest' : 'Manifest'; }
		
		document.title = setTitle;
		document.querySelector('meta[property="og:title"]').setAttribute("content", setTitle);
		
	}
	
	ManifestResize() { MI.Visualization.Resize(); }

	ShowLoader() {
		document.getElementById('loader').style.background = 'rgba(0,0,0,0.8)';
		document.getElementById('loader').style.display = 'block'; 
	}
	
	ClearLoader() {
		document.getElementById('loader').style.display = 'none'; 
	}
	
	ShowMessage(msg) {
		clearTimeout(this.interval);
		document.getElementById('messages').classList.remove("closed");
		document.getElementById('messages').textContent = msg;
		this.interval = setTimeout((e) => {document.getElementById('messages').textContent = ''; document.getElementById('messages').classList.add("closed");}, 4000);
	}
	
	ShakeAlert(element, time=20, coefficient=50){
	    element.style.transition = '0.1s';
    
	    let interval = setInterval(() => {
	    	let randomInt1 = Math.floor((Math.random() * 3) + 1);
	        let randomInt2 = Math.floor((Math.random() * 3) + 1);
	        let randomInt3 = Math.floor((Math.random() * 2) + 1);
        
	        let phase1 = (randomInt1 % 2) === 0 ? '+' : '-';
	        let phase2 = (randomInt2 % 2) === 0 ? '+' : '-';
	        let phase3 = (randomInt3 % 2) === 0 ? '+' : '-';
        
	        let transitionX = ((phase1 + randomInt1) * (coefficient / 10)) + 'px';
               
	        element.style.transform = 'translate('+transitionX+',0)';  
	    }, time);
		setTimeout((i=interval, el=element) => { clearInterval(i);  element.style.transform = '';}, 300); 
	}
	
	/* Mobile Functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
	Mobilify(id, index) {
		document.getElementById('sidepanel').classList.add('middle');
		this.SetupSwipes('mheader-'+id, function(el,d) {
			const sidepanel = document.getElementById('sidepanel');
			if (sidepanel.classList.contains('top')) {
				if (d === 'd') { document.querySelectorAll('#sidepanel, .view-wrapper').forEach(el => { el.classList.remove('top'); el.classList.add('middle'); }); }
			} else if (sidepanel.classList.contains('middle')) {
				if (d === 'u') { document.querySelectorAll('#sidepanel, .view-wrapper').forEach(el => { el.classList.remove('middle'); el.classList.add('top'); }); }			
				else if (d === 'd') {  document.querySelectorAll('#sidepanel, .view-wrapper').forEach(el => { el.classList.remove('middle'); el.classList.add('bottom'); }); }
			} else if (sidepanel.classList.contains('bottom')) {
				if (d === 'u') {  document.querySelectorAll('#sidepanel, .view-wrapper').forEach(el => { el.classList.remove('bottom'); el.classList.add('middle'); }); }
			}
			if (MI.Visualization.type !== 'map') { MI.Visualization.Set(MI.Visualization.type); }					
		});
	}

	SetupSwipes(el,func) {
		let swipe_det = {sX: 0, sY: 0, eX: 0, eY: 0};
		const min_x = 30, max_x = 30, min_y = 50, max_y = 60;
		let ele = document.getElementById(el);

		ele.addEventListener('touchstart', (e) => {  const t = e.touches[0]; swipe_det.sX = t.screenX; swipe_det.sY = t.screenY; });
		ele.addEventListener('touchmove', (e) => {  e.preventDefault(); const t = e.touches[0]; swipe_det.eX = t.screenX; swipe_det.eY = t.screenY; });
		ele.addEventListener('touchend', (e) => {  
			let direc = '';
		
			if ((((swipe_det.eX - min_x > swipe_det.sX) || (swipe_det.eX + min_x < swipe_det.sX)) && ((swipe_det.eY < swipe_det.sY + max_y) && (swipe_det.sY > swipe_det.eY - max_y) && (swipe_det.eX > 0)))) { direc = (swipe_det.eX > swipe_det.sX) ? 'r' : 'l'; }
			else if ((((swipe_det.eY - min_y > swipe_det.sY) || (swipe_det.eY + min_y < swipe_det.sY)) && ((swipe_det.eX < swipe_det.sX + max_x) && (swipe_det.sX > swipe_det.eX - max_x) && (swipe_det.eY > 0)))) { direc = (swipe_det.eY > swipe_det.sY) ? 'd' : 'u'; }

			if (direc !== '') { if (typeof func === 'function') func(el,direc); }
			swipe_det.sX = 0; swipe_det.sY = 0; swipe_det.eX = 0; swipe_det.eY = 0;
		});
	}

	IsMobile() { return window.innerWidth > 920 ? false : true; }
	
}