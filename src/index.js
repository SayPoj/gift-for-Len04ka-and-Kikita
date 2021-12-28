import 'sidebarjs/lib/sidebarjs.css';
import '@/styles/styles.scss'
import * as SidebarJS from "sidebarjs";
import QRCode from 'qrcode'

window.onload = () => {
    function trackEvent(eventCategory, eventAction, eventLabel, eventContext) {
        if (typeof dataLayer !== 'undefined') {
            dataLayer.push({
                event: 'GAEvent',
                eventCategory: eventCategory,
                eventAction: eventAction,
                eventLabel: eventLabel,
                eventContext: eventContext,
            });
        }
    }

    let prizePreviewContainer = document.querySelector('.prize-preview')
    let getPrizeContainer = document.querySelector('.get-prize-container')
    let goToGetPrizeButton = prizePreviewContainer.querySelector('button.btn-go-to-get-prize')
    new SidebarJS.SidebarElement({
        component: document.querySelector('[sidebarjs="sidebarDataToReceive"]'),
        position: 'right',
        nativeSwipe: true,
        onOpen:()=>{
            trackEvent('Gift','Click','Button');
        },
        nativeSwipeOpen: false,
        backdropOpacity: 0.6,
    });
    new SidebarJS.SidebarElement({
        component: document.querySelector('[sidebarjs="sidebarPointsForReceive"]'),
        position: 'right',
        onOpen:()=>{
            trackEvent('DeliveryPoints','Click','Button');
        },
        nativeSwipe: false,
        nativeSwipeOpen: false,
        backdropOpacity: 0.6,
    });

    let phyjiApiKey = 'AnniMxbctnhl1ZCtJQV9Cg'
    let phyjiApiDomain = 'https://hnk.promo-kit.ru'
    let urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('promocode')) {
        redirectToPhyji()
    }
    let prizeId = urlParams.get('promocode').split('-')[0]
    let promocodeId = urlParams.get('promocode').split('-')[1]

    let request = new XMLHttpRequest();
    request.open(
        'GET',
        `${phyjiApiDomain}/api/v4/prizes/${prizeId}/promocodes/${promocodeId}/fields`,
        true,
    );
    request.setRequestHeader('Api-Key', phyjiApiKey)

    request.onload = function () {
        let response = JSON.parse(this.response)
        if (response.end_sale_date){
            console.log(response)
            response.end_sale_date = new Date(response.end_sale_date)
            response.end_sale_date = + response.end_sale_date.getDate()+'.' + response.end_sale_date.getMonth()+'.'+response.end_sale_date.getFullYear()
            document.querySelectorAll('.end-sale-date').forEach(el=>el.innerHTML = response.end_sale_date)
        }
        if (this.status >= 200 && this.status < 400) {

            createMapOfPoints(response.product.id)
            /**/
            let productPoints
            getPointsByProduct(response.product).then((points) => {
                productPoints = points

                createListOfPoints(productPoints)
                document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .search-wrapper .list-loading').remove()
            })
            /**/

            goToGetPrizeButton.addEventListener('click', () => {
                trackEvent('Start','Click','Button');
                goToGetPrize()
            })

            function goToGetPrize() {
                prizePreviewContainer.classList.add('d-none')
                getPrizeContainer.classList.remove('d-none')
            }

            document.getElementById('prize-get-code').innerHTML = response.code

            QRCode.toCanvas(document.getElementById('qrcode-container'), response.code, function (error) {
                if (error) console.error(error)
            })

            if (response.pin){
                document.getElementById('prize-get-pin-code').innerHTML = response.pin
            } else {
                document.querySelector('.pin-code-step').remove()
            }

            document.querySelector('.footer-need-help-btn').addEventListener('click', () => {
                document.querySelector('.help-modal-container').classList.add('show')
            })

            document.querySelector('.help-modal-container button.close').addEventListener('click', () => {
                document.querySelector('.help-modal-container').classList.remove('show')
            })

            document.querySelector('.payed-modal-container button.close').addEventListener('click', () => {
                document.querySelector('.payed-modal-container').classList.remove('show')
            })


            document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .search-input').addEventListener('input', (e) => {
                if (!productPoints) {
                    return false
                }
                if (e.data) {
                    document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .clear-icon').style.display = 'block'
                    filterPoints(response.product, e.target.value, productPoints)
                } else if ((e.inputType === 'insertFromPaste' || e.inputType === 'deleteContentBackward') && e.target.value) {
                    filterPoints(response.product, e.target.value, productPoints)
                } else {
                    document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .clear-icon').style.display = 'none'
                    getPointsByProduct(response.product).then((points) => {
                        productPoints = points

                        createListOfPoints(productPoints)
                    })
                }
            })

            document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .clear-icon').addEventListener('click', () => {
                document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .search-input').value = ''
                document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .clear-icon').style.display = 'none'
                getPointsByProduct(response.product).then((points) => {
                    productPoints = points

                    createListOfPoints(productPoints)
                })
            })

        } else {
            redirectToPhyji()
        }
    };

    document.querySelectorAll('.faq').forEach(element => {
        element.addEventListener('click', redirectToPhyji)
    })

    document.querySelector('.switch-wrapper').addEventListener('click', () => {
        document.querySelector('.switch-wrapper').querySelectorAll('.switch-item').forEach((elem) => {
            elem.classList.toggle('active')
        })
        Array.from(document.querySelector('[sidebarjs="sidebarPointsForReceive"] .body').children).forEach((elem) => {
            elem.classList.toggle('active')
        })
        if (document.querySelector('[sidebarjs="sidebarPointsForReceive"] .body').children.item(1).classList.contains('active')) {
            document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .search-wrapper').style.display = 'none'
        } else {
            document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .search-wrapper').style.display = 'flex'
        }
    })

    request.onerror = redirectToPhyji

    request.send();

    function redirectToPhyji() {
        window.location.replace('https://phyji.com/')
    }

    function getPointsByProduct(product) {
        document.querySelector('[sidebarjs="sidebarPointsForReceive"] .body .points-list-wrapper').innerHTML = '<div class="list-loading"></div>'
        return new Promise((resolve, reject) => {
            getCitiesByProduct(product.id).then((async citiesPoints => {
                for (let city of citiesPoints) {
                    await getAgentsByCity(product.id, city.id).then(async (citesAgents) => {
                        for (let agent of citesAgents) {
                            if (agent.size > 1) {
                                await getPointsByAgent(product.id, city.id, agent.id).then(points => {
                                    agent.points = points
                                })
                            }
                        }
                        city.agents = citesAgents
                    })
                }
                resolve(citiesPoints)
            }))
        })

    }

    function getCitiesByProduct(productId) {
        return new Promise((resolve, reject) => {
            let citiesByProductRequest = new XMLHttpRequest();
            citiesByProductRequest.open(
                'GET',
                `https://gift.gmoji.world/api/v2/geo/cities-by-product?product_id=${productId}&locale=ru_RU`,
                true);
            citiesByProductRequest.onload = async function () {
                if (this.status >= 200 && this.status < 400) {
                    let citiesByProductResponse = JSON.parse(this.response)
                    resolve(citiesByProductResponse.cities)
                } else {
                    redirectToPhyji()
                }
            };

            citiesByProductRequest.onerror = redirectToPhyji

            citiesByProductRequest.send();

        })
    }

    function getAgentsByCity(productId, cityId) {
        return new Promise((resolve, reject) => {
            let agentsByCityRequest = new XMLHttpRequest();
            agentsByCityRequest.open(
                'GET',
                `https://gift.gmoji.world/api/v2/geo/points-by-product?product_id=${productId}&city_id=${cityId}&locale=ru_RU`,
                true);
            agentsByCityRequest.onload = async function () {
                if (this.status >= 200 && this.status < 400) {
                    let agentsByCityResponse = JSON.parse(this.response)
                    resolve(agentsByCityResponse)
                } else {
                    redirectToPhyji()
                }
            };

            agentsByCityRequest.onerror = redirectToPhyji

            agentsByCityRequest.send();
        });
    }

    function getPointsByAgent(productId, cityId, agentId) {
        return new Promise((resolve, reject) => {
            let pointsByAgentRequest = new XMLHttpRequest();
            pointsByAgentRequest.open(
                'GET',
                `https://gift.gmoji.world/api/v2/geo/points-by-product?product_id=${productId}&city_id=${cityId}&agent_id=${agentId}&locale=ru_RU`,
                true);
            pointsByAgentRequest.onload = function () {
                if (this.status >= 200 && this.status < 400) {
                    let pointsByAgentResponse = JSON.parse(this.response)
                    resolve(pointsByAgentResponse)
                } else {
                    redirectToPhyji()
                }
            };

            pointsByAgentRequest.onerror = redirectToPhyji

            pointsByAgentRequest.send();
        });
    }

    function declOfNum(number, titles) {
        let cases = [2, 0, 1, 1, 1, 2];
        return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
    }

    function createListOfPoints(points) {
        let pointsListContainer = document.querySelector('[sidebarjs="sidebarPointsForReceive"] .body .points-list-wrapper')
        pointsListContainer.innerHTML = ''
        if (points.length) {
            points.forEach(city => {
                let cityAgentsHtml = ''
                city.agents.forEach(agent => {
                    let agentPointsHtml = ''
                    if (agent.size === 1) {
                        agentPointsHtml += `
                            <div class="contragent-point" id="${agent.id}" data-latitude="${agent.geo.lat}" data-longitude="${agent.geo.lng}">
                                <div>
                                    <div class="contragent-point-address"> ${agent.street}, ${agent.building} </div>
                                    ${agent.working_hours ? `<div class="working-hours">${agent.working_hours}</div>` : ''}
                                </div>
                                
                                <div class="contragent-point-distance">
                                <!--<div class="contragent-point-distance-text">16 км</div>-->
                                    <button class="contragent-point-map"                                    
                                        data-address="${agent.street}, ${agent.building}" 
                                        data-name="${agent.name}" 
                                        data-latitude="${agent.geo.lat}" 
                                        data-longitude="${agent.geo.lng}"
                                    ></button>
                                </div>
                            </div>
                        `
                    } else if (agent.size >= 1) {
                        agent.points.forEach(point => {
                            agentPointsHtml += `
                            <div class="contragent-point" id="${agent.id}"  data-latitude="${point.geo.lat}" data-longitude="${point.geo.lng}">
                                <div>
                                    ${agent.category ? `<div class="point-category"> ${agent.category}</div>` : ''}
                                    <div class="contragent-point-address">
                                        ${point.street}, ${point.building}
                                    </div>
                                </div>
                                <div class="contragent-point-distance">
                                <!--<div class="contragent-point-distance-text">16 км</div>-->
                                    <button class="contragent-point-map"                                    
                                        data-address="${point.street}, ${point.building}" 
                                        data-name="${agent.name}" 
                                        data-latitude="${point.geo.lat}" 
                                        data-longitude="${point.geo.lng}"
                                    ></button>
                                </div>
                            </div>
                        `

                        })
                    }


                    cityAgentsHtml += ` 
                        <details class="points-contragent-details">
                            <summary class="points-contragent-summary-wrapper">
                                <img class="points-contragent-summary-logo" width="40px" height="40px" src="${agent.logo ? 'https://gift.gmoji.world' + agent.logo.image.path : 'assets/icons/no-contragent-logo.svg'}" alt="no logo">
                                <div>
                                    <div class="points-contragent-summary-title"> ${agent.name} </div>
                                    ${agent.category ? `<div class="point-category"> ${agent.category}</div>` : ''}
                                    <div class="points-contragent-number">${agent.size === 1 ? agent.size : agent.points.length} ${declOfNum(agent.size === 1 ? agent.size : agent.points.length, ['точка', 'точки', 'точек'])}</div>
                                </div>
                            </summary>
                            ${agentPointsHtml}
                        </details>`
                })

                pointsListContainer.innerHTML += `
                    <details class="points-city-details">
                        <summary class="points-city-summary"> ${city.name} </summary>`
                    + cityAgentsHtml
                    + `</details>`
            })
        } else {
            pointsListContainer.innerHTML = '<div class="empty-search-result">Ничего не найдено.</div>'
        }
    }

    function createFilteredListOfPoints(points) {
        let pointsListContainer = document.querySelector('[sidebarjs="sidebarPointsForReceive"] .body .points-list-wrapper')
        pointsListContainer.innerHTML = ''
        if (points.length) {
            points.forEach(point => {
                pointsListContainer.innerHTML += `
                    <div class="filtered-point" id="${point.id}"  data-latitude="${point.geo.lat}" data-longitude="${point.geo.lng}">
                        <div class="point-info-wrapper">
                            <img class="point-logo" width="40px" height="40px" src="${point.logo ? 'https://gift.gmoji.world' + point.logo.image.path : 'assets/icons/no-contragent-logo.svg'}" alt="no logo">
                            <div>
                                <div class="points-contragent-summary-title"> ${point.name} </div>
                                ${point.category ? `<div class="point-category"> ${point.category}</div>` : ''}
                                <div class="contragent-point-address"> ${point.street}, ${point.building} </div>
                                ${point.working_hours ? `<div class="working-hours">${point.working_hours}</div>` : ''}
                            </div>
                        </div>
                        <div class="contragent-point-distance">
                            <!--<div class="contragent-point-distance-text">16 км</div>-->
                            <button class="contragent-point-map"
                                data-address="${point.street}, ${point.building}" 
                                data-name="${point.name}" 
                                data-latitude="${point.geo.lat}" 
                                data-longitude="${point.geo.lng}"
                            ></button>
                        </div>
                    </div>
                `
            })
        } else {
            pointsListContainer.innerHTML = '<div class="empty-search-result">Ничего не найдено.</div>'
        }
    }

    function filterPoints(product, value, points) {
        document.querySelector('[sidebarjs="sidebarPointsForReceive"] .body .points-list-wrapper').innerHTML = '<div class="list-loading"></div>'
        getPointsForFilter(product.id, value).then((points) => {
            createFilteredListOfPoints(points)
        })
    }

    function getPointsForFilter(productId, value) {
        return new Promise((resolve, reject) => {
            let request = new XMLHttpRequest();
            request.open(
                'GET',
                `https://gift.gmoji.world/api/v2/geo/points-by-product?product_id=${productId}&query=${value}&out=ungrouped&locale=ru_RU`,
                true);
            request.onload = async function () {
                if (this.status >= 200 && this.status < 400) {
                    resolve(JSON.parse(this.response))
                } else {
                    redirectToPhyji()
                }
            };

            request.onerror = redirectToPhyji

            request.send();
        });
    }

    function getPointsForMap(productId) {
        return new Promise((resolve, reject) => {
            let pointsForMapRequest = new XMLHttpRequest();
            pointsForMapRequest.open(
                'GET',
                `https://gift.gmoji.world/api/v2/geo/points-by-product?product_id=${productId}&out=ungrouped&locale=ru_RU`,
                true);
            pointsForMapRequest.onload = function () {
                if (this.status >= 200 && this.status < 400) {
                    resolve(JSON.parse(this.response))
                } else {
                    redirectToPhyji()
                }
            };

            pointsForMapRequest.onerror = redirectToPhyji

            pointsForMapRequest.send();
        });
    }

    function createMapOfPoints(productId) {
        let yandexMapApiKey = '58bda805-7aea-426f-b197-54b59c8e753b'
        let yandexMapScriptTag = document.createElement('script')
        yandexMapScriptTag.id = 'yandexMapScriptTag'
        yandexMapScriptTag.src = "https://api-maps.yandex.ru/2.1/?lang=ru_RU&amp;apikey=" + yandexMapApiKey

        getPointsForMap(productId).then((mapPoints) => {
                document.querySelector('head').appendChild(yandexMapScriptTag)

                yandexMapScriptTag.onload = () => {
                    window.ymaps.ready(() => {
                        let myMap = new window.ymaps.Map('points-map', {
                            center: [55.751574, 37.573856],
                            zoom: 9
                        })

                        navigator.geolocation.getCurrentPosition((pos) => {
                            myMap.setCenter([pos.coords.latitude, pos.coords.longitude])
                        })

                        document.querySelector('[sidebarjs="sidebarPointsForReceive"] .body .points-list-wrapper').addEventListener('click', (e) => {
                            if (e.target.classList.contains('contragent-point-address')) {
                                myMap.setCenter([
                                    e.target.parentElement.parentElement.dataset.latitude || e.target.parentElement.parentElement.parentElement.dataset.latitude
                                    , e.target.parentElement.parentElement.dataset.longitude || e.target.parentElement.parentElement.parentElement.dataset.longitude], 23, {
                                    checkZoomRange: true
                                })
                                document.querySelector('.switch-wrapper').click()
                            }

                        })

                        mapPoints.forEach(mapPoint => {
                            myMap.geoObjects.add(
                                new ymaps.Placemark([mapPoint.geo.lat, mapPoint.geo.lng], {
                                    hintContent: mapPoint.name,

                                    id: mapPoint.id,
                                    balloonContentHeader: `
                                        <div class="map-baloon-content-head">
                                            <img src="${mapPoint.logo ? 'https://gift.gmoji.world' + mapPoint.logo.image.path : 'assets/icons/no-contragent-logo.svg'}" alt="logo"
                                                width="40px"
                                                height="40px">  
                                            <div class="header">
                                                ${mapPoint.name}
                                                ${mapPoint.category ? `<div class="description">${mapPoint.category}</div>` : ''}
                                            </div>
                                            
                                        </div>
                                    `,
                                    balloonContentBody: `
                                        <div class="map-baloon-content-body">
                                            <div class="address">${mapPoint.street}, ${mapPoint.building}</div>
                                            ${mapPoint.working_hours ? `<div class="working-hours">${mapPoint.working_hours}</div>` : ''}
                                        </div>    
                                    `,
                                    balloonContentFooter: `
                                        <div class="map-baloon-content-footer">
                                            <button class="create-route-btn"
                                             data-address="${mapPoint.street}, ${mapPoint.building}" 
                                             data-name="${mapPoint.name}" 
                                             data-latitude="${mapPoint.geo.lat}" 
                                             data-longitude="${mapPoint.geo.lng}"
                                            >
                                                <img src="assets/icons/icon-create-route.svg" alt="">
                                                Построить маршрут
                                            </button> 
                                        </div>
                                    `
                                }, {
                                    iconLayout: 'default#imageWithContent',
                                    iconImageHref: mapPoint.logo ? 'https://gift.gmoji.world' + mapPoint.logo.image.path : 'assets/icons/no-contragent-logo.svg',
                                    iconImageSize: [40, 40],
                                    iconImageOffset: [-20, -20],
                                    iconContentOffset: [15, 15],
                                })
                            )
                        })

                        document.querySelector('[sidebarjs="sidebarPointsForReceive"] .header .switch-wrapper .switch-item .list-loading').remove()

                    });
                }

        })
    }

    document.querySelector('[sidebarjs="sidebarPointsForReceive"] .body .points-list-wrapper').addEventListener('click', (e) => {
        if (e.target.classList.contains('contragent-point-map')) {
            let routeModal = document.querySelector('.route-modal-container')
            routeModal.classList.add('show')
            routeModal.querySelector('.close').addEventListener('click', () => {
                e.preventDefault()
                routeModal.classList.remove('show')
                routeModal.querySelector('.modal-header-title').innerHTML = ''
                routeModal.querySelector('.modal-header-address').innerHTML = ''
            })

            routeModal.querySelector('.modal-header-title').innerHTML = e.target.dataset.name
            routeModal.querySelector('.modal-header-address').innerHTML = e.target.dataset.address
            routeModal.querySelector('.copy-btn').addEventListener('click', (e) => {
                e.preventDefault()
                const elem = document.createElement('textarea');
                elem.value = routeModal.querySelector('.modal-header-address').innerHTML;
                document.body.appendChild(elem);
                elem.select();
                document.execCommand('copy');
                document.body.removeChild(elem);
                e.target.innerText = 'Скопировано!'
                e.target.style.color = '#028132'
                setTimeout(() => {
                    e.target.innerText = 'Скопировать адрес'
                    e.target.style.color = '#ED1C24'
                }, 2500)
            })
            routeModal.querySelector('.open-ymap').setAttribute('href',
                `https://yandex.ru/maps/?pt=${e.target.dataset.longitude},${e.target.dataset.latitude}&z=18&l=map`
            )
            routeModal.querySelector('.open-ymap').setAttribute('target', '_blank')


            routeModal.querySelector('.open-gmap').setAttribute('href',
                `https://maps.google.com/maps?daddr=${e.target.dataset.latitude},${e.target.dataset.longitude}&amp;ll=`
            )
            routeModal.querySelector('.open-gmap').setAttribute('target', '_blank')
        }


    })

    document.querySelector('[sidebarjs="sidebarPointsForReceive"] .body .points-map-wrapper').addEventListener('click', (e) => {
        if (e.target.classList.contains('create-route-btn')) {
            let routeModal = document.querySelector('.route-modal-container')
            routeModal.classList.add('show')
            routeModal.querySelector('.close').addEventListener('click', () => {
                e.preventDefault()
                routeModal.classList.remove('show')
                routeModal.querySelector('.modal-header-title').innerHTML = ''
                routeModal.querySelector('.modal-header-address').innerHTML = ''
            })

            routeModal.querySelector('.modal-header-title').innerHTML = e.target.dataset.name
            routeModal.querySelector('.modal-header-address').innerHTML = e.target.dataset.address
            routeModal.querySelector('.copy-btn').addEventListener('click', (e) => {
                e.preventDefault()
                const elem = document.createElement('textarea');
                elem.value = routeModal.querySelector('.modal-header-address').innerHTML;
                document.body.appendChild(elem);
                elem.select();
                document.execCommand('copy');
                document.body.removeChild(elem);
                e.target.innerText = 'Скопировано!'
                e.target.style.color = '#028132'
                setTimeout(() => {
                    e.target.innerText = 'Скопировать адрес'
                    e.target.style.color = '#ED1C24'
                }, 2500)
            })
            routeModal.querySelector('.open-ymap').setAttribute('href',
                `https://yandex.ru/maps/?pt=${e.target.dataset.longitude},${e.target.dataset.latitude}&z=18&l=map`
            )
            routeModal.querySelector('.open-ymap').setAttribute('target', '_blank')


            routeModal.querySelector('.open-gmap').setAttribute('href',
                `https://maps.google.com/maps?daddr=${e.target.dataset.latitude},${e.target.dataset.longitude}&amp;ll=`
            )
            routeModal.querySelector('.open-gmap').setAttribute('target', '_blank')
        }


    })
}
