import GENRES from './genresDb.js';
import debounce from 'lodash.debounce';
import ioController from '../components/infiniteScroll';

const API_KEY_V3 = '1c82be463eec2d8b6de50f5ad36006eb'; //на всякий случай - ключ в строку если добавлять, а так везде тулим options (v4 key)
const API_KEY_V4 = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxYzgyYmU0NjNlZWMyZDhiNmRlNTBmNWFkMzYwMDZlYiIsInN1YiI6IjVmOWZiYTFmY2EwZTE3MDAzYjRkZTljNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.pioIw9ZjnLVCSLXXsSHDarKErsdPXcQ3JCynCs6jkII'

const BASE_URL = 'https://api.themoviedb.org/3/'
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/'



const options = {
    headers: {
        'Authorization': `Bearer ${API_KEY_V4}`,
    }
}


 class FilmotekaApi {
    _page = 1;
    width = window.screen.width;
    _lang = localStorage.getItem('lang') || 'en';
    constructor(){
        this.onResize();
        window.addEventListener('resize', debounce(this.onResize, 500));
    }
    
    onResize = () => { //тут получим ширину экрана при ресайзе вьюпорта
        this.width = window.screen.width;
        if (this.width < 768){
            this.perPage = 5;
            localStorage.setItem('perPage', this.perPage);
            //ioController.createObserver();

        } else if (this.width < 1024 && this.width >= 768){
            this.perPage = 8;
            localStorage.setItem('perPage', this.perPage);
            ioController.destroyObserver()

        } else if (this.width >= 1024) {
            this.perPage = 9;
            localStorage.setItem('perPage', this.perPage);
            ioController.destroyObserver()
        }
    
        
    }

    ckeckPerPage = (viewPage) =>{ //поиск нужных страниц АПИ, соответствующих странице пагинации 
        //viewPage - страница пагинации
    

        this.perPage = localStorage.getItem('perPage');
        this.factStart = viewPage * this.perPage - this.perPage; //Фактически отображаемые старт
        this.factEnd = viewPage * this.perPage; //последний из фактически отображаемых фильмов

        this.neededPageStart = 1;
        this.neededPageEnd = 1;
       
        this.neededPageStart = Math.floor(this.factStart / 20) + 1;    
        this.neededPageEnd = Math.floor(this.factEnd / 20) + 1; 
        
    }

    set page(val) { //сет страницы в запросе
        this._page = val;
    }

    get page (){ //получение страницы в запросе
        return this._page;
    }

    set lang(val){
        this._lang = val; 
    }

    get lang(){
        return this._lang
    }

    async getTrends(viewPage) { 
        this.ckeckPerPage(viewPage);

        let res = await fetch(`${BASE_URL}discover/movie?sort_by=popularity.desc&page=${this.neededPageStart}&language=${this._lang}`, options)
            .then( res => res.json() )
            .then(async res => {
                //console.log(res)
                localStorage.setItem('pagesToView', Math.floor(res.total_results / this.perPage))
                localStorage.setItem('mode', 'deault') //для инифинит скролла
                let viewRes = [];
            
                if (this.neededPageStart === this.neededPageEnd) {
                    viewRes = res.results.slice(this.factStart % 20, this.factEnd % 20); //получам столько, сколько надо
                } else {
                    let resFirstPart = res.results.slice(this.factStart % 20); //прийдётся делать ещё запрос
                   
                    let resSecondPart = await fetch(`${BASE_URL}discover/movie?sort_by=popularity.desc&page=${this.neededPageEnd}&language=${this._lang}`, options)
                        .then(res => res.json())
                        .then(res => res.results.slice(0, this.factEnd % 20 ))
                    //console.log('FirstPart = ', resFirstPart, ' ;SecondPart = ', resSecondPart);
                    viewRes = [...resFirstPart, ...resSecondPart];
                }
                //console.log(viewRes)
                const imgArr = viewRes.map( (el, i) =>

                    (el.poster_path) ? 
                    `${IMG_BASE_URL}w500${el.poster_path}` :
                    `https://vcunited.club/wp-content/uploads/2020/01/No-image-available-2.jpg`
                )
                const movies = {
                    page: res.page,
                    total_pages: res.total_pages,
                    total_results: res.total_results,
                    results: viewRes
                }
                return {movies, 'posters': imgArr}
            }) 
        
        return res;
    }
    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        //получает ответ в виде объекта с ключом movies, и массива адресов картинок posters,
        //movies - объект с page = 1; total_pages = 1000; total_results = 20000;
        //а так же с массивом таких объектов в results:
        /*
        adult: false
        backdrop_path: "/hbrXbVoE0NuA1ORoSGGYNASagrl.jpg"
        genre_ids: [35]
        id: 740985
        media_type: "movie"
        original_language: "en"
        original_title: "Borat Subsequent Moviefilm"
        overview: "14 years after making a film about his journey across the USA, Borat risks life and limb when he returns to the United States with his young daughter, and reveals more about the culture, the COVID-19 pandemic, and the political elections."
        popularity: 774.843
        poster_path: "/6agKYU5IQFpuDyUYPu39w7UCRrJ.jpg"
        release_date: "2020-10-23"
        title: "Borat Subsequent Moviefilm"
        video: false
        vote_average: 6.7
        vote_count: 707

        */

    getMoviesByQuery(query){
        console.log(this._lang);
        return fetch(`${BASE_URL}search/movie?language=${this._lang}&query=${query}&page=${this._page}`, options) //change multi to movie
            .then(res => res.json())
            .then(res => {
                localStorage.setItem('pagesToView', Math.floor(res.total_results / this.perPage))
                localStorage.setItem('mode', 'search') //для инифинит скролла
                const imgArr = res.results.map( el => (el.poster_path) ? 
                `${IMG_BASE_URL}w500${el.poster_path}` :
                `https://vcunited.club/wp-content/uploads/2020/01/No-image-available-2.jpg`
                )
                //console.dir(res, imgArr);
                return {movies: res, 'posters': imgArr}
            })
    }

    async getAllResults(query){
        this._page = 1;
        localStorage.setItem('mode', 'search');
        let currentRes = await this.getMoviesByQuery(query);
        let resultsArr = [currentRes];
        for (let i = 1; i < currentRes.movies.total_pages; i++) {
            this._page++;
            resultsArr.push(this.getMoviesByQuery(query));

        }
        return Promise.all(resultsArr);
    }
}
 const api = new FilmotekaApi;

 export default api
