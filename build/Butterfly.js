var CHAOS;
(function (CHAOS) {
    (function (Portal) {
        (function (Butterfly) {
            $(document).ready(function () {
                return $("form[data-portalpath]").each(function (index, element) {
                    return $(element).data("searchhelper", new SearchHelper(element));
                });
            });
            var SearchHelper = (function () {
                function SearchHelper(searchForm) {
                    var _this = this;
                    this._canLoadMore = false;
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
                    this._schemaGUID = this._resultsContainer.data("schema");
                    if(!this._filter) {
                        this._filter = "{0}";
                    }
                    this._searchForm.submit(function (event) {
                        event.preventDefault();
                        _this.Search(_this._searchField.val());
                    });
                    this._loadMoreButton.click(function (event) {
                        event.preventDefault();
                        _this.LoadMore();
                    });
                    this._closeDetailsButton.click(function (event) {
                        event.preventDefault();
                        _this.HideDetails();
                    });
                    this._client.SessionAcquired().Add(function (session) {
                        return _this.Search("");
                    });
                    CHAOS.Portal.Client.Session.Create(null, this._client);
                }
                SearchHelper.prototype.SetCanLoadMore = function (canLoadMore) {
                    this._canLoadMore = canLoadMore;
                    if(canLoadMore) {
                        this._loadMoreButton.show();
                    } else {
                        this._loadMoreButton.hide();
                    }
                };
                SearchHelper.prototype.Search = function (query) {
                    this._resultsContainer.children("[data-template], [data-seperator]").remove();
                    this._query = this._filter.replace("{0}", query);
                    this._nextPageIndex = 0;
                    this._resultsCountLabel.text(0);
                    this._resultsTotalCountLabel.text(0);
                    this.HideDetails();
                    this.LoadMore();
                };
                SearchHelper.prototype.LoadMore = function () {
                    var _this = this;
                    this.SetCanLoadMore(false);
                    CHAOS.Portal.Client.Object.Get(function (response) {
                        if(response.Error != null) {
                            console.log(response.Error.Message);
                            return;
                        }
                        _this._resultsCountLabel.text((_this._nextPageIndex - 1) * _this._pageSize + response.Result.Count);
                        _this._resultsTotalCountLabel.text(response.Result.TotalCount);
                        _this.ShowResults(response.Result.Results);
                        if(Math.ceil(response.Result.TotalCount / _this._pageSize) > _this._nextPageIndex) {
                            _this.SetCanLoadMore(true);
                        }
                    }, this._query, null, this._accessPoint, this._nextPageIndex++, this._pageSize, true, false, false, false, this._client);
                };
                SearchHelper.prototype.ShowResults = function (results) {
                    var _this = this;
                    var hasResults = this._resultsContainer.children("[data-template]").length != 0;
                    results.forEach(function (r) {
                        if(!r.Metadatas) {
                            return;
                        }
                        r.Metadatas.forEach(function (m) {
                            if(m.MetadataSchemaGUID != _this._schemaGUID) {
                                return;
                            }
                            var item = _this.ApplyDataToTemplate(_this._resultsTemplate.clone(), m.MetadataXML);
                            item.click(function () {
                                return _this.ShowDetails(m.MetadataXML);
                            });
                            if(hasResults) {
                                _this._resultsContainer.append(_this._resultsSeperator.clone());
                            } else {
                                hasResults = true;
                            }
                            _this._resultsContainer.append(item);
                        });
                    });
                };
                SearchHelper.prototype.ShowDetails = function (metadata) {
                    this.ApplyDataToTemplate(this._detailsView, metadata);
                    this._detailsView.show();
                    this._resultsContainer.hide();
                    this._loadMoreButton.hide();
                };
                SearchHelper.prototype.HideDetails = function () {
                    this._detailsView.hide();
                    this._resultsContainer.show();
                    this.SetCanLoadMore(this._canLoadMore);
                };
                SearchHelper.prototype.ApplyDataToTemplate = function (template, data) {
                    template.find("[data-template]").each(function (index, element) {
                        var targetedData = $(data).find($(element).data("template")).text();
                        if($(element).is("a")) {
                            $(element).attr("href", targetedData);
                        } else {
                            if($(element).is("img")) {
                                $(element).attr("src", targetedData);
                            } else {
                                if($(element).is("input")) {
                                    $(element).val(targetedData);
                                } else {
                                    $(element).text(targetedData);
                                }
                            }
                        }
                    });
                    return template;
                };
                return SearchHelper;
            })();            
        })(Portal.Butterfly || (Portal.Butterfly = {}));
        var Butterfly = Portal.Butterfly;
    })(CHAOS.Portal || (CHAOS.Portal = {}));
    var Portal = CHAOS.Portal;
})(CHAOS || (CHAOS = {}));
