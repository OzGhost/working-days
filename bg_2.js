'use strict';
(function(){

  function randomInRange(a, b) {
    var x = typeof a == 'number' ? a : 0;
    var y = typeof b == 'number' ? b : 0;
    var wide = Math.floor(Math.abs(x - y));
    var ceil = Math.max(x, y);
    var delta = Math.round(Math.random() * ceil * 1000) % (wide + 1);
    return ceil - delta;
  }

  var base_rq_host = 'http://localhost:8081/ivy/api/designer/pricingcalculator/recommended-interest-rate';

  var base_rq_body = {
    "languageCode": "en",
    "dossier": {
      "calculationBase": {
        "businessCase": {
          "businessCreationType": "RENEWAL"
        },
        "funding": {
          "propertyType": "CONDOMINIUM_RESIDENCE",
          "marketValue": 2820000,
          "rating": "FIVE",
          "ratingAgency": "RAIP",
          "segment": "VPK",
          "mortgageAmount": 1896000
        },
        "financialCheck": {
          "additionalSecurityManagement": {
            "additionalSecurities": []
          },
          "etpFeasibility": false,
          "violationMinRequirements": false
        }
      },
      "product": {
        "currentTranche": {
          "productCode": "FIXED_RATE_MORTGAGE",
          "payOutDate": "01.04.2019",
          "period": 10
        }
      },
      "debtorManagement": {
        "debtors": [
          {
            "personalNumber": 13986226,
            "person": {
              "firstName": "Thomas",
              "lastName": "Müller"
            },
            "address": {
              "country": "CHE"
            }
          }
        ]
      }
    },
    "bankCode": "VABE"
  };

  var base_rq_body_v2 = {
    "bankId":null,
    "languageCode":"de",
    "dossier":{
        "calculationBase":{
          "businessCase":{
              "businessCreationType":"RENEWAL"
          },
          "funding":{
              "propertyType":"SINGLE_HOUSE_RESIDENCE",
              "marketValue":33333333,
              "rating":"SEVEN",
              "ratingAgency":"RAUK",
              "segment":"VPK",
              "mortgageAmount":380000
          },
          "financialCheck":{
              "additionalSecurityManagement":{
                "additionalSecurities":[
                    {
                      "amount":85.45,
                      "additionalSecurity":"CREDIT_PILLAR_3_OWN_BANK"
                    },
                    {
                      "amount":34.2,
                      "additionalSecurity":"CREDIT_PILLAR_3_OWN_BANK"
                    }
                ]
              },
              "etpFeasibility":true,
              "violationMinRequirements":true
          }
        },
        "product":{
          "currentTranche":{
              "productCode":"FIXED_RATE_MORTGAGE",
              "payOutDate":"01.04.2019",
              "period":5
          }
        },
        "debtorManagement":{
          "debtors":[
              {
                "person":{
                    "kycId":null,
                    "salutation":null,
                    "customSalutation":null,
                    "title":null,
                    "titleForSelectMenu":null,
                    "firstName":"Ursula",
                    "lastName":"Lehmann",
                    "nationality":"country-1",
                    "otherNationalities":null,
                    "secondNationality":null,
                    "domicileCountry":null,
                    "placeOfOrigin":null,
                    "birthDate":null,
                    "maritalStatus":null,
                    "customMaritalStatus":null,
                    "signature":null,
                    "function":null,
                    "relationshipToAH":null,
                    "correspondenceLanguage":null,
                    "identificationId":null,
                    "identificationExpiry":null,
                    "token":null,
                    "riskWarning":null,
                    "solvencyType":null,
                    "solvencyValue":null,
                    "dateOfIssue":null,
                    "identificationType":null,
                    "gender":null,
                    "homeTown":null,
                    "secondHomeTown":null,
                    "unmarriedName":null,
                    "ahv":null,
                    "income":null,
                    "maritalDate":null
                },
                "address":{
                    "street":null,
                    "zipCode":"3422",
                    "city":"Rüdtligen",
                    "country":"country-1",
                    "houseNo":null,
                    "poBox":null,
                    "supplement":null,
                    "careOf":null,
                    "canton":null,
                    "additionalAddress":null,
                    "nokReason":null,
                    "nokOtherReason":null
                }
              }
          ]
        }
    },
    "bankCode":"VABE"
  };

  var hostNode = document.createElement("INPUT");
  hostNode.style.position = "fixed";
  hostNode.style.bottom = "150px";
  hostNode.style.right = "12px";
  hostNode.style.width = "800px";
  hostNode.type = "text";
  hostNode.value = base_rq_host;
  document.body.appendChild(hostNode);

  var recur = document.createElement("INPUT");
  recur.style.position = "fixed";
  recur.style.bottom = "120px";
  recur.style.right = "265px";
  recur.type = "checkbox";
  document.body.appendChild(recur);

  function fire(seq) {
    var beginning = new Date().getTime();
    var inChargeBody = getBody();
    var product = inChargeBody['dossier']['product']['currentTranche']['productCode'];
    fetch(hostNode.value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ZmludGVjaDpmaW50ZWNoIUAj'
      },
      body: JSON.stringify( inChargeBody )
    })
    .then(function(){
      var duration = new Date().getTime() - beginning;
      console.log("cout << request: ", seq, " take: ", duration, "ms for: ", product);
      if (recur.checked) {
        fire(seq+1);
      }
    })
    .catch(function(){
      console.warn("cout << failed on: ", seq);
    });
  }

  var base_product = [
    'FIXED_RATE_MORTGAGE',
    'FIXED_RATE_MORTGAGE_FORWARD_PROMOTION',
    'FAMILY_MORTGAGE',
    'FAMILY_MORTGAGE_FORWARD_PROMOTION',
    'FLEX_MORTGAGE',
    '1_MORTGAGE_VARIABLE',
    '2_MORTGAGE_VARIABLE',
    '1_FAMILY_MORTGAGE_VARIABLE',
    '2_FAMILY_MORTGAGE_VARIABLE'
  ];

  function getBody() {
    var body = JSON.parse(JSON.stringify(base_rq_body_v2));
    var index = randomInRange(0, 8);
    var inChargeProduct = base_product[index];
    body['dossier']['product']['currentTranche']['productCode'] = inChargeProduct;
    return body;
  }

  var inputNode = document.createElement("INPUT");
  inputNode.style.position = "fixed";
  inputNode.style.bottom = "120px";
  inputNode.style.right = "65px";
  inputNode.type = "number";
  document.body.appendChild(inputNode);

  var node = document.createElement("BUTTON");
  node.innerHTML = "FIRE";
  node.style.position = "fixed";
  node.style.bottom = "120px";
  node.style.right = "12px";
  node.addEventListener('click', function(){
    if (recur.checked) {
      fire(1);
      return;
    }
    var times = +inputNode.value;
    for (var i = 0; i < times; i++) {
      fire(i);
    }
  });
  document.body.appendChild(node);
})();
