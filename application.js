/* application.js is code which include feedreader*/


// namespacing the components 
App = {
  views:{},
  models:{},
  collections:{},
  vent:_.extend({}, Backbone.Events)
}


// model to handle each feed source 
App.models.feedSrcModel = Backbone.Model.extend({
  defaults:{
    title:'',
    feed_url:''
  }
});

// feed source collection 
App.collections.feedSrcCollection = Backbone.Collection.extend({
  model:App.models.feedSrcModel
});



// to hand each feed with default attributes 
App.models.feedModel = Backbone.Model.extend({
  defaults:{
    star:0,
    read:0,
    like:0
  }
});


// feed collection 
App.collections.feedCollection = Backbone.Collection.extend({
  model:App.models.feedModel,
  initialize:function(models,opt){
    this.feedSrcCollection = opt.feedSrcCollection;
    this.custom_fetch();
    this.feedSrcCollection.on("add",function(){
      this.reset();
      this.custom_fetch();

    },this);
  },
  custom_fetch:function(){
    _.each(this.feedSrcCollection.models,function(e,y){
      this.url = e.get('feed_url');
      this.current_feed_title = e.get("title");
      this.fetch();
    },this);
  },
  fetch:function(){
    var collection = this;
    var feed_title = collection.current_feed_title;

    $.get(this.url,function(data){
      xml_object = $.parseXML(data.documentElement.innerHTML)
      $xml_object = $(xml_object);
      _.each($xml_object.find('item'),function(ele){
        var obj = {};
        _.each($(ele).children(),function(e){
          obj[e.tagName] = e.innerHTML;
        });
        obj.feed_src_title = feed_title;
        collection.add(obj);
      },this);
    });
  }
});

App.views.feedItemView = Backbone.View.extend({
  tagName:'div',
  initialize:function(){
    this.model.on('change',this.render,this);
  },
  events:{
    'click button#star':'star_item',
    'click button#like':'like_item',
    'click button#unread':'read_item'
  },
  star_item:function(){
    this.model.set('star',(this.model.get('star') ? 0 : 1));
  },
  like_item:function(){
    this.model.set('like',(this.model.get('like') ? 0 : 1));
  },
  read_item:function(){
    this.model.set('read',(this.model.get('read') ? 0 : 1));
  },
  render:function(){
    var template = _.template($('#feedItemView').html());
    this.$el.html(template(this.model.toJSON()));
    return this;
  }
});

App.views.feedCollectionView = Backbone.View.extend({
  el:"#collectionView",
  initialize:function(){
    //this.ListenOn(this.model,"change",this.render);
  this.collection.on("add",function(){
    this.filtered_collection = this.collection.models;
      this.render();
    },this);

    App.vent.on('filter',function(filter_obj){
      if("all" in filter_obj){
        this.filtered_collection = this.collection.models;
      }else{
        this.filtered_collection = this.collection.where(filter_obj);
      }
      this.render();
    },this);
  },
  render:function(){
    this.$el.empty();
    _.each(this.filtered_collection,function(model){
        var itemview = new App.views.feedItemView({model:model});
        this.$el.append(itemview.render().el);
      },this);

    return this;
  }
});

App.views.appControlMenu = Backbone.View.extend({
  el:"#controlview",
  initialize:function(){
    this.render();
    this.collection.on("add",function(model){
      this.src_menu(model);
    },this);
  },
  events:{
    "click li":'filter',
  },
  filter:function(e){
    var ele = $(e.currentTarget).data();
    if('filter' in ele){
       var key = {};
       key[ele.filter] = 1
       if(ele.filter == 'read') key[ele.filter] = 0
       App.vent.trigger('filter',key);
     }
     if('title' in ele){
       App.vent.trigger('filter',{"feed_src_title":ele.title});
     }
  },
  src_menu:function(m){
   var tmp = _.template("<li data-title='<%= title %>'><a href='#'><%= title %></a></li>");
   this.$el.find('ul').append(tmp(m.toJSON()));
  },
  render:function(){
    tpl = _.template($('#grouplist').html());
    this.$el.append(tpl({}));
  },
}
);

App.views.feedSrcFormView = Backbone.View.extend({
  el:'#subscribefeed',
  events:{
    'click button#subadd':'add_src'
  },
  add_src:function(){
    var new_src= new App.models.feedSrcModel();
    new_src.set('title',this.$el.find("#title").val());
    new_src.set('feed_url',this.$el.find("#feed_url").val());
    this.collection.add(new_src);
  }
});


// starting off the collection
var feedRouter = Backbone.Router.extend({
  routes:{
    "":'boot'
  },
  boot:function(){
    var feed_src_collection = new App.collections.feedSrcCollection();
    var feed_collection =  new App.collections.feedCollection([],{feedSrcCollection:feed_src_collection});
    new App.views.feedCollectionView({collection:feed_collection});
    new App.views.appControlMenu({collection:feed_src_collection});
    new App.views.feedSrcFormView({collection:feed_src_collection});

    var feeds = [{
      title:"Hacker news",
      feed_url:"https://news.ycombinator.com/rss"
    },
    {
      title:"google news",
      feed_url:"https://news.google.com/?output=rss"
    }
    ];

    feed_src_collection.add(feeds);
  }
});

new feedRouter();
Backbone.history.start();

