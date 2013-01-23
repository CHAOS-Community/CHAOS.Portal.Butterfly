/// <reference path="../../../lib/jquery.d.ts"/>
/// <reference path="../../../lib/PortalClient.d.ts"/>

module CHAOS.Portal.Butterfly
{
	$(document).ready(() => $("input[type=text][data-portalpath]").each((index, element) => $(element).data("searchhelper", new SearchHelper(element))));

	class SearchHelper
	{
		private _client:CHAOS.Portal.Client.PortalClient;
		private _searchField:JQuery;
		private _resultsContainer:JQuery;
		private _resultsTemplate:JQuery;
		private _loadMoreButton:JQuery;
		private _detailsView:JQuery;
		private _closeDetailsButton:JQuery;

		private _accessPoint:string;
		private _filter:string;
		private _query:string;
		private _schemaGUID:string;
		private _pageSize:number;

		private _nextPageIndex:number;
		private _canLoadMore:bool = false;

		constructor(searchField: Element)
		{
			this._searchField = $(searchField);
			this._client = new CHAOS.Portal.Client.PortalClient(this._searchField.data("portalpath"));
			this._resultsContainer = $(this._searchField.data("results"));
			this._resultsTemplate = this._resultsContainer.children("[data-template]").first().detach().show();
			this._loadMoreButton = $(this._resultsContainer.data("loadmore"));
			this._detailsView = $(this._resultsContainer.data("details"));
			this._closeDetailsButton = this._detailsView.find("[data-close]");
			this._accessPoint = this._searchField.data("accesspoint");
			this._filter = this._searchField.data("searchfilter");
			this._pageSize = this._resultsContainer.data("pagesize");
			this._schemaGUID = this._resultsContainer.data("schema");

			if(!this._filter)
				this._filter = "{0}";

			this._searchField.keypress(event =>
			{
				if(event.which == 13)
					this.Search(this._searchField.val());
			});

			$(this._searchField.data("searchbutton")).click(event =>
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
			this._resultsContainer.children("[data-template]").remove();
			this._query = this._filter.replace("{0}", query);
			this._nextPageIndex = 0;
			
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
				this.ShowResults(response.Result.Results);

				if(Math.ceil(response.Result.TotalCount / this._pageSize) > this._nextPageIndex)
					this.SetCanLoadMore(true);

			}, this._query, null, this._accessPoint, this._nextPageIndex++, this._pageSize, true, false, false, false, this._client);
		}

		private ShowResults(results:any[]): void
		{
			results.forEach(r =>
			{
				if(!r.Metadatas)
					return;

				r.Metadatas.forEach(m =>
				{
					if(m.MetadataSchemaGUID != this._schemaGUID)
						return;

					var item = this.ApplyDataToTemplate(this._resultsTemplate.clone(), m.MetadataXML);

					item.click(() => this.ShowDetails(m.MetadataXML));

					this._resultsContainer.append(item);
				});
			});
		}

		private ShowDetails(metadata:string):void
		{
			this.ApplyDataToTemplate(this._detailsView, metadata);

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

		private ApplyDataToTemplate(template:JQuery, data:string):JQuery
		{
			template.children("[data-template]").each((index, element) =>
			{
				$(element).text($(data).find($(element).data("template")).text());
			});

			return template;
		}
	}
}
