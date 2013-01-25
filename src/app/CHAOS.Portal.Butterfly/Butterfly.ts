/// <reference path="../../../lib/jquery.d.ts"/>
/// <reference path="../../../lib/PortalClient.d.ts"/>

module CHAOS.Portal.Butterfly
{
	$(document).ready(() => $("form[data-portalpath]").each((index, element) => $(element).data("searchhelper", new SearchHelper(element))));

	if (!Array.prototype.forEach)
	{
		Array.prototype.forEach = (callbackfn: (value: {}, index: number, array: {}[]) => void , thisArg?: any): void =>
		{
			for(var i = 0, len = this.length; i < len; ++i)
			{
				callbackfn.call(thisArg, this[i], i, this);
			}
		}
	}

	class SearchHelper
	{
		private _client:CHAOS.Portal.Client.PortalClient;
		private _searchForm:JQuery;
		private _searchField:JQuery;
		private _resultsContainer:JQuery;
		private _resultsTemplate:JQuery;
		private _resultsSeperator: JQuery;
		private _loadMoreButton:JQuery;
		private _detailsView:JQuery;
		private _closeDetailsButton:JQuery;

		private _resultsCountLabel:JQuery;
		private _resultsTotalCountLabel:JQuery;

		private _accessPoint:string;
		private _filter:string;
		private _query:string;
		private _resultsDefaultSchemaGUID:string;
		private _detailsDefaultSchemaGUID:string;
		private _pageSize:number;

		private _nextPageIndex:number;
		private _canLoadMore:bool = false;

		constructor(searchForm: Element)
		{
			this._searchForm = $(searchForm);
			this._searchField = this._searchForm.find("input[type=text]").first();
			this._resultsContainer = $(this._searchForm.data("results"));
			this._resultsTemplate = this._resultsContainer.children("[data-template]").first().detach().show();
			this._resultsSeperator = this._resultsContainer.children("[data-seperator]").first().detach().show();
			this._loadMoreButton = $(this._resultsContainer.data("loadmore"));
			this._detailsView = $(this._resultsContainer.data("details"));
			this._closeDetailsButton = this._detailsView.find("[data-close]");

			this._resultsCountLabel = $("[data-resultscount=" + this._resultsContainer.attr('id') + "]");
			this._resultsTotalCountLabel = $("[data-resultstotalcount=" + this._searchForm.attr('id') + "]");

			this._client = new CHAOS.Portal.Client.PortalClient(this._searchForm.data("portalpath"));
			this._accessPoint = this._searchForm.data("accesspoint");
			this._filter = this._searchForm.data("searchfilter");
			this._pageSize = this._resultsContainer.data("pagesize");
			this._resultsDefaultSchemaGUID = this._resultsContainer.data("defaultschema");
			this._detailsDefaultSchemaGUID = this._detailsView.data("defaultschema") ? this._detailsView.data("defaultschema") : this._resultsDefaultSchemaGUID;

			if(!this._filter)
				this._filter = "{0}";

			this._searchForm.submit(event =>
			{
				event.preventDefault();
					this.Search(this._searchField.val());
			});

			this._loadMoreButton.click(event =>
			{
				event.preventDefault();
				this.LoadMore();
			});

			this._closeDetailsButton.click(event =>
			{
				event.preventDefault();

				this.HideDetails();
			});

			this._client.SessionAcquired().Add(session => this.Search(""));
			CHAOS.Portal.Client.Session.Create(null, this._client);
		}

		private SetCanLoadMore(canLoadMore:bool):void
		{ 
			this._canLoadMore = canLoadMore;

			if(canLoadMore)
				this._loadMoreButton.show();
			else
				this._loadMoreButton.hide();
		}

		private Search(query:string):void
		{ 
			this._resultsContainer.children("[data-template], [data-seperator]").remove();
			this._query = this._filter.replace("{0}", query);
			this._nextPageIndex = 0;
			this._resultsCountLabel.text(0);
			this._resultsTotalCountLabel.text(0);

			this.HideDetails();
			
			this.LoadMore();
		}

		private LoadMore():void
		{
			this.SetCanLoadMore(false);

			CHAOS.Portal.Client.Object.Get(response =>
			{
				if (response.Error != null)
				{
					console.log(response.Error.Message);
					return;
				}

				this._resultsCountLabel.text((this._nextPageIndex - 1) * this._pageSize + response.Result.Count);
				this._resultsTotalCountLabel.text(response.Result.TotalCount);

				this.ShowResults(response.Result.Results);

				if(Math.ceil(response.Result.TotalCount / this._pageSize) > this._nextPageIndex)
					this.SetCanLoadMore(true);

			}, this._query, null, this._accessPoint, this._nextPageIndex++, this._pageSize, true, true, false, false, this._client);
		}

		private ShowResults(results:any[]): void
		{
			var hasResults = this._resultsContainer.children("[data-template]").length != 0;
			results.forEach(r =>
			{
				var item = this.ApplyDataToTemplate(this._resultsTemplate.clone(), r, this._resultsDefaultSchemaGUID);

				item.click(() => this.ShowDetails(r));

				if (hasResults)
					this._resultsContainer.append(this._resultsSeperator.clone());
				else
					hasResults = true;
					
				this._resultsContainer.append(item);
			});
		}

		private ShowDetails(object:any):void
		{
			this.ApplyDataToTemplate(this._detailsView, object, this._detailsDefaultSchemaGUID);

			this._detailsView.show();
			this._resultsContainer.hide();
			this._loadMoreButton.hide();
		}

		private HideDetails():void
		{
			this._detailsView.hide();
			this._resultsContainer.show();

			this.SetCanLoadMore(this._canLoadMore);
		}

		private ApplyDataToTemplate(template:JQuery, object:any, defaultSchemaGUID:string):JQuery
		{
			if (object.Metadatas)
				this.ApplyMetadataToTemplate(template, object.Metadatas, defaultSchemaGUID)
			
			if(object.Files)
				this.ApplyFileDataToTemplate(template, object.Files)

			return template;
		}

		private ApplyMetadataToTemplate(template: JQuery, metadatas: any[], defaultSchemaGUID: string):JQuery
		{ 
			var defaultMetadata:string = null;

			metadatas.forEach(m =>
			{
				if(m.MetadataSchemaGUID == defaultSchemaGUID)
					defaultMetadata = m.MetadataXML;
			});

			if (defaultMetadata)
			{
				template.find("[data-template-metadata]").each((index, element) =>
				{
					var targetedData = $(defaultMetadata).find($(element).data("template-metadata")).text();

					if ($(element).is("a"))
						$(element).attr("href", targetedData);
					else if ($(element).is("img"))
						$(element).attr("src", targetedData);
					else if ($(element).is("input"))
						$(element).val(targetedData);
					else
						$(element).text(targetedData);
				});
			}

			return template;
		}

		private ApplyFileDataToTemplate(template: JQuery, files: any[]):JQuery
		{
			template.find("[data-template-file]").each((index, element) =>
			{
				var targetFile: any = null;

				files.forEach(f =>
				{
					if(targetFile == null && f.Format == $(element).data("template-file"))
						targetFile = f;
				});

				if(targetFile == null) return;

				if ($(element).is("a"))
						$(element).attr("href", targetFile.URL);
					else if ($(element).is("img"))
						$(element).attr("src", targetFile.URL);
					else if ($(element).is("input"))
						$(element).val(targetFile.OriginalFilename);
					else
						$(element).text(targetFile.OriginalFilename);
			});

			return template;
		}
	}
}