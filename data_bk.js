import { ContactService } from "../../contacts/contact-service";
import { ReactiveVar } from 'meteor/reactive-var';
import { CoreService } from '../../js/core-service';
import { UtilityService } from "../../utility-service";
import { TaxRateService } from "../../settings/settings-service.js";
import XLSX from 'xlsx';
import { SideBarService } from '../../js/sidebar-service';
import { ProductService } from '../../product/product-service';
import { ManufacturingService } from "../../manufacture/manufacturing-service";
import { CRMService } from "../../crm/crm-service";
import { ReportService } from "../../reports/report-service";
import { FixedAssetService } from "../../fixedassets/fixedasset-service";
import { StockTransferService } from '../../inventory/stockadjust-service';
import '../../lib/global/indexdbstorage.js';
import TableHandler from '../../js/Table/TableHandler';
import { Template } from 'meteor/templating';
import './datatablelist.html';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { cloneDeep, reject } from "lodash";
import 'datatables.net';
import 'datatables.net-buttons';
import 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';
import 'datatables.net-buttons/js/buttons.html5';
import 'datatables.net-buttons/js/buttons.flash';
import 'datatables.net-buttons/js/buttons.print';
import 'jszip';
//import '../../lib/global/colResizable.js';
// let _jsZip = jszip;
import '../date_picker/transaction_list_date.html'
let sideBarService = new SideBarService();
let utilityService = new UtilityService();


Template.datatablelist.onCreated(function () {
    const templateObject = Template.instance();
    templateObject.transactiondatatablerecords = new ReactiveVar([]);
    templateObject.datatablerecords = new ReactiveVar([]);
    templateObject.tableheaderrecords = new ReactiveVar([]);
    templateObject.tabledatalists = new ReactiveVar([]);
    templateObject.selectedFile = new ReactiveVar();
    templateObject.displayfields = new ReactiveVar([]);
    templateObject.reset_data = new ReactiveVar([]);
    templateObject.tablename = new ReactiveVar();
    templateObject.currentproductID = new ReactiveVar();
    templateObject.currenttype = new ReactiveVar();
    templateObject.datahandler = new ReactiveVar(templateObject.data.datahandler);
    templateObject.tabledata = new ReactiveVar();
    templateObject.apiParams = new ReactiveVar();
    templateObject.columnDef = new ReactiveVar();
    templateObject.isOverviewPage = new ReactiveVar(false);
    templateObject.showAddPop = new ReactiveVar(false);
    templateObject.rowsSaveData = new ReactiveVar([]);
    templateObject.operatorSaveData = new ReactiveVar([]);
    templateObject.operatorValueSaveData = new ReactiveVar([]);
    templateObject.inputValueSaveData = new ReactiveVar([]);
    templateObject.rowsSaveFieldData = new ReactiveVar([]);
    templateObject.allSavedData = new ReactiveVar([]);
    templateObject.filterTitleOne = new ReactiveVar("");
    templateObject.filterTitleTwo = new ReactiveVar("");
    templateObject.selectedTableData = new ReactiveVar([]);
    templateObject.selectedTableField = new ReactiveVar([]);
    templateObject.editTableData = new ReactiveVar([]);
    templateObject.editTableField = new ReactiveVar([]);
    templateObject.tableheaderfeilds = new ReactiveVar([]);

    templateObject.autorun(() => {
        const curdata = Template.currentData();
        let currentProductID = curdata.productID || "";
        templateObject.currentproductID.set(currentProductID);
        let currenttype = curdata.type || "";
        templateObject.currenttype.set(currenttype);
        templateObject.apiParams.set(templateObject.data.apiParams || []);
        if(FlowRouter.current().path.includes('/accountsoverview') || FlowRouter.current().path.includes('/bankingoverview')
        ||FlowRouter.current().path.includes('/contactoverview') ||FlowRouter.current().path.includes('/crmoverview') ||
        FlowRouter.current().path.includes('/dashboard') || FlowRouter.current().path.includes('/dashboardexe') || FlowRouter.current().path.includes('/dashboardsalesmanager') ||
        FlowRouter.current().path.includes('/dashboardsales') || FlowRouter.current().path.includes('/deliveryOverview') || FlowRouter.current().path.includes('/fixedassetsoverview') ||
        FlowRouter.current().path.includes('/inventorylist') || FlowRouter.current().path.includes('/manufacturingoverview') || FlowRouter.current().path.includes('/paymentoverview') ||
        FlowRouter.current().path.includes('/payrolloverview') || FlowRouter.current().path.includes('/purchasesoverview') || FlowRouter.current().path.includes('/salesoverview'))  {
            templateObject.isOverviewPage.set(true)
        }
    });

})

Template.datatablelist.onRendered(async function () {
    let templateObject = Template.instance();
    let currenttablename = templateObject.data.tablename || "";
    if(templateObject.data.custid) {
        currenttablename = currenttablename + "_" + templateObject.data.custid;
    }
    let targetReportName = templateObject.data.indexeddbname;
    let data = {};
    try {
            const dataObject = await getVS1Data("FiterSaveFunctionData");
            if (dataObject && dataObject.length !== 0) {
              data = JSON.parse(dataObject[0].data);
                const dataArr = data.tcustomfiltervs1;
                const targetObj = dataArr.find(item => item.fields.ReportName === targetReportName);

                if(targetObj) {
                    templateObject.filterTitleOne.set(targetObj.fields.FilterNameOne);
                    templateObject.filterTitleTwo.set(targetObj.fields.FilterNameTwo);
                } else {
                }
            }
        } catch (error) {

        }
    let displaySetting = cloneDeep(templateObject.data.tableheaderrecords);
    let tableHeaderFields = displaySetting.map(item => item.field);
    templateObject.tableheaderfeilds.set(tableHeaderFields);

    templateObject.initCustomFieldDisplaySettings = function (data, listType) {
        let reset_data = templateObject.reset_data.get();
        let savedHeaderInfo;
        setTimeout(()=>{
            // templateObject.showCustomFieldDisplaySettings(reset_data);
            try {

                //Resize API is currently having a bug
                getVS1Data("VS1_Customize").then(function(dataObject) {
                    if (dataObject.length == 0) {
                        sideBarService.getNewCustomFieldsWithQuery(parseInt(localStorage.getItem('mySessionEmployeeLoggedID')), listType).then(function(data) {
                            if(data.ProcessLog.Obj.CustomLayout.length > 0) {
                                savedHeaderInfo = data.ProcessLog.Obj.CustomLayout[0].Columns;
                                templateObject.showCustomFieldDisplaySettings(savedHeaderInfo);
                            } else {
                                templateObject.showCustomFieldDisplaySettings(reset_data);
                            }
                        }).catch(function(err) {});
                    } else {
                        let data = JSON.parse(dataObject[0].data);
                        if (data.ProcessLog.Obj != undefined && data.ProcessLog.Obj.CustomLayout.length > 0) {
                            let added = false
                            for (let i = 0; i < data.ProcessLog.Obj.CustomLayout.length; i++) {
                                if (data.ProcessLog.Obj.CustomLayout[i].TableName == listType) {
                                    added = true
                                    savedHeaderInfo = data.ProcessLog.Obj.CustomLayout[i].Columns;
                                    templateObject.showCustomFieldDisplaySettings(savedHeaderInfo);
                                }
                            }
                            if(!added) {
                                templateObject.showCustomFieldDisplaySettings(reset_data);
                            }
                        }else{
                          templateObject.showCustomFieldDisplaySettings(reset_data);
                        };
                    }
                });

            } catch (error) {
            }
            return;
        }, 100)
    }

    templateObject.showCustomFieldDisplaySettings = async function (savedHeaderInfo) {

        let custFields = [];
        let customData = {};
        let customFieldCount = savedHeaderInfo.length;
        let reset_data = templateObject.reset_data.get();
        let checkBoxHeader = `<div class="custom-control custom-switch colChkBoxAll  text-center pointer">
            <input name="pointer" class="custom-control-input colChkBoxAll pointer" type="checkbox" id="colChkBoxAll" value="0">
            <label class="custom-control-label colChkBoxAll" for="colChkBoxAll"></label>
            </div>`;

        for (let r = 0; r < customFieldCount; r++) {
            customData = {
                active: savedHeaderInfo[r].active,
                id: savedHeaderInfo[r].index,
                custfieldlabel: savedHeaderInfo[r].label == 'checkBoxHeader'?checkBoxHeader : savedHeaderInfo[r].label,
                class: savedHeaderInfo[r].class,
                display: savedHeaderInfo[r].display,            //display have to set by default value
                width: savedHeaderInfo[r].width ? savedHeaderInfo[r].width : ''
            };
            //let currentTable = document.getElementById(currenttablename)
            /*
            if (savedHeaderInfo[r].active == true) {
                if (currentTable) {
                    $('#' + currenttablename + ' .' + savedHeaderInfo[r].class).removeClass('hiddenColumn');
                }
            } else if (savedHeaderInfo[r].active == false) {
                if (currentTable && savedHeaderInfo[r].class) {
                    $('#' + currenttablename + ' .' + savedHeaderInfo[r].class).addClass('hiddenColumn');
                }
            };*/
            custFields.push(customData);
        }
        await templateObject.displayfields.set(custFields);
        let tableData = await templateObject.getTableData();
        await templateObject.displayTableData(tableData);
    }
    templateObject.init_reset_data = function () {
        let records = templateObject.data.tableheaderrecords;
        if(records && records.length > 0) {

            templateObject.reset_data.set(templateObject.data.tableheaderrecords);
            templateObject.initCustomFieldDisplaySettings("", currenttablename)
        } else {
            setTimeout(()=>{

                templateObject.init_reset_data();
            },1000)
        }
    }

    await templateObject.init_reset_data();

    if (FlowRouter.current().queryParams.success) {
        $('.btnRefresh').addClass('btnRefreshAlert');
    };
    let activeViewDeletedLabel = "View Deleted";
    let hideViewDeletedLabel = "Hide Deleted";

    let isShowSelect = false;
    if(templateObject.data.istransaction == true){
      isShowSelect = false;
      activeViewDeletedLabel = "View Deleted";
      hideViewDeletedLabel = "Hide Deleted";
    }else{
      isShowSelect = true;
      activeViewDeletedLabel = "View In-Active";
      hideViewDeletedLabel = "Hide In-Active";
    };

    if(templateObject.data.viewCompletedButton == true){
      activeViewDeletedLabel = "View Completed";
      hideViewDeletedLabel = "Hide Completed";
    };

    if(templateObject.data.viewShowSoldButton == true){
      activeViewDeletedLabel = "Show Sold";
      hideViewDeletedLabel = "Hide Sold";
    };

    function MakeNegative() {
        $('td').each(function () {
            if ($(this).text().indexOf('-' + Currency) >= 0) $(this).addClass('text-danger')
        });

        $("td.colStatus").each(function () {
            if ($(this).text() == "In-Active") $(this).addClass("text-deleted");
            if ($(this).text() == "Deleted") $(this).addClass("text-deleted");
            if ($(this).text() == "Full") $(this).addClass("text-fullyPaid");
            if ($(this).text() == "Part") $(this).addClass("text-partialPaid");
            if ($(this).text() == "Reconciled") $(this).addClass("text-reconciled");
            if ($(this).text() == "Converted") $(this).addClass("text-converted");
            if ($(this).text() == "Completed") $(this).addClass("text-completed");
            if ($(this).text() == "Not Converted") $(this).addClass("text-NotConverted");
            if ($(this).text() == "On-Hold") $(this).addClass("text-Yellow");
            if ($(this).text() == "Processed") $(this).addClass("text-Processed");
            if ($(this).text() == "In-Stock") $(this).addClass("text-instock");
            if ($(this).text() == "Sold") $(this).addClass("text-sold");
        });
        $("td.colFinished").each(function () {
            if ($(this).text() == "In-Active") $(this).addClass("text-deleted");
            if ($(this).text() == "Deleted") $(this).addClass("text-deleted");
            if ($(this).text() == "Full") $(this).addClass("text-fullyPaid");
            if ($(this).text() == "Part") $(this).addClass("text-partialPaid");
            if ($(this).text() == "Reconciled") $(this).addClass("text-reconciled");
            if ($(this).text() == "Converted") $(this).addClass("text-converted");
            if ($(this).text() == "Completed") $(this).addClass("text-completed");
            if ($(this).text() == "Not Converted") $(this).addClass("text-Yellow");
            if ($(this).text() == "On-Hold") $(this).addClass("text-Yellow");
            if ($(this).text() == "Processed") $(this).addClass("text-Processed");
        });

        $("td.colWOStatus").each(function () {
            if ($(this).text() == "Invoiced") {
                $(this).find('button').addClass("btn-success");
            } else if($(this).text().toLowerCase().includes("completed")) {
                $(this).find('button').addClass("btn-orange");
            } else if($(this).text().toLowerCase().includes("unscheduled")) {
                $(this).find('button').addClass("btn-grey");
            } else if($(this).text() == "Scheduled"){
                $(this).find('button').addClass("btn-warning");
            }
        });

        $("td.colEmpStatus").each(function () {
            if ($(this).text().includes("Clocked On")) {
                $(this).find('button').addClass("btn-success");
            } else if($(this).text() == "Assigned") {
                $(this).find('button').addClass("btn-warning");
            } else if($(this).text() == "Clocked Off") {
                $(this).find('button').addClass("btn-orange");
            } else {
                $(this).find('button').addClass("btn-grey");
            }
        });

        $("td.colAssigned").each(function () {
            if($(this).text().toLowerCase().includes("unassigned")) {
                $(this).find('button').addClass("btn-grey");
            } else if($(this).text() == "Assigned") {
                $(this).find('button').addClass("btn-warning");
            }
        });

        $("td.colQAStatus").each(function () {
            if ($(this).text() == "QA Started") {
                $(this).find('button').addClass("btn-orange");
            } else if($(this).text() == "QA Stopped") {
                $(this).find('button').addClass("btn-warning");
            } else {
                $(this).find('button').addClass("btn-grey");
            }
        });

        $("td.colLiveStatus").each(function () {
            if ($(this).text() == 'Accepted') {
              $(this).addClass('text-Green');
            } else if ($(this).text() == 'Declined') {
              $(this).addClass('text-deleted');
            } else if ($(this).text() == 'Shared') {
              $(this).addClass('text-Yellow');
            }
        });

        $("td.colTaxRatePurchaseDefault").each(function () {
            var isChecked = $(this).find('input[type="radio"]').prop('checked');
            if (isChecked) {
              $(this).closest('tr').addClass('checkRowSelected');
            }
        });

        $("td.colTaxRateSalesDefault").each(function () {
            var isChecked = $(this).find('input[type="radio"]').prop('checked');
            if (isChecked) {
              $(this).closest('tr').addClass('checkRowSelected');
            }
        });
        /*
        $("td.colPayrollLoaded").each(function () {
            if ($(this).text() == "Sent") {
                $(this).addClass("text-completed");
            } else {
                $(this).addClass("Other-Yellow-Color");
            }

        });
        */
    };


    let indexDBName = templateObject.data.indexeddbname || '';
    let indexDBLowercase = templateObject.data.lowercaseDataName || indexDBName.toLowerCase();






    // set initial table rest_data



    // await templateObject.initCustomFieldDisplaySettings("", currenttablename);

    templateObject.resetData = function (dataVal) {
        location.reload();
    };
    //Contact Overview Data
    templateObject.getTableData = async function (deleteFilter = false) {

        var customerpage = 0;
        return new Promise((resolve, reject) => {
            // resolve(templateObject.data.apiName(initialDatatableLoad, 0, false))
            if(templateObject.data.tabledata) {
                resolve(templateObject.data.tabledata)
            } else {
                if (templateObject.data.istransaction == false) {


                    getVS1Data(indexDBName).then(function (dataObject) {
                        if (dataObject.length == 0) {
                            let that = templateObject.data.service;
                            let params = [initialDatatableLoad, 0, deleteFilter];
                            if (templateObject.data.typefilter) {//Martin Tony
                               params = [initialDatatableLoad, 0, deleteFilter, templateObject.data.typefilter];
                            }
                            if(templateObject.data.apiName) {
                                templateObject.data.apiName.apply(that, params).then(function (dataReturn) {
                                    addVS1Data(indexDBName, JSON.stringify(dataReturn)).then(function () {
                                        resolve(dataReturn)
                                    })
                                })
                            } else {
                                resolve([])
                            }
                        } else {
                            let data = JSON.parse(dataObject[0].data);
                            if(data[indexDBLowercase].length > 0) {
                                resolve(data)
                            }
                            else {
                                /*
                                let that = templateObject.data.service;
                                let params = [initialDatatableLoad, 0, deleteFilter];
                                if (templateObject.data.typefilter) {//Martin Tony
                                     params = [initialDatatableLoad, 0, deleteFilter, templateObject.data.typefilter];
                                }
                                if(templateObject.data.apiName) {
                                    templateObject.data.apiName.apply(that, params).then(function (dataReturn) {
                                        addVS1Data(indexDBName, JSON.stringify(dataReturn)).then(function () {
                                            resolve(dataReturn)
                                        })
                                    })
                                } else {
                                    resolve([])
                                }
                                */
                            resolve([]);
                         }

                        }
                    }).catch(function (e) {
                        let that = templateObject.data.service;
                        let params = [initialDatatableLoad, 0, deleteFilter];
                        if (templateObject.data.typefilter) {//Martin Tony
                           params = [initialDatatableLoad, 0, deleteFilter, templateObject.data.typefilter];
                        }
                        if(templateObject.data.apiName) {
                            templateObject.data.apiName.apply(that, params).then(function (dataReturn) {
                                addVS1Data(indexDBName, JSON.stringify(dataReturn)).then(function () {
                                    resolve(dataReturn)
                                })
                            })
                        } else {resolve([])}
                    })
                } else {
                    var currentBeginDate = new Date();
                    var begunDate = moment(currentBeginDate).format("DD/MM/YYYY");
                    let fromDateMonth = (currentBeginDate.getMonth() + 1);
                    let fromDateDay = currentBeginDate.getDate();
                    if ((currentBeginDate.getMonth() + 1) < 10) {
                        fromDateMonth = "0" + (currentBeginDate.getMonth() + 1);
                    } else {
                        fromDateMonth = (currentBeginDate.getMonth() + 1);
                    }

                    if (currentBeginDate.getDate() < 10) {
                        fromDateDay = "0" + currentBeginDate.getDate();
                    }
                    var toDate = currentBeginDate.getFullYear() + "-" + (fromDateMonth) + "-" + (fromDateDay);
                    let prevMonth11Date = (moment().subtract(reportsloadMonths, 'months')).format("YYYY-MM-DD");
                    let params = cloneDeep(templateObject.apiParams.get());
                    let that = templateObject.data.service;
                    // for (let i = 0; i < params.length; i++) {
                    //     if(params[i] == 'ignoredate') {
                    //         params[i] = true;
                    //     } else if(params[i] == 'dateFrom') {
                    //         params[i] = prevMonth11Date
                    //     } else if(params[i] == 'dateTo') {
                    //         params[i] = toDate
                    //     } else if(params[i] == 'limitFrom') {
                    //         params[i] = 0
                    //     } else if(params[i] == 'limitCount') {
                    //         params[i] = initialReportLoad
                    //     } else if(params[i] == 'deleteFilter') {
                    //         params[i] = deleteFilter
                    //     }
                    // }
                    getVS1Data(indexDBName).then(function (dataObject) {
                        $('.' + currenttablename+" #dateFrom").attr('readonly', false);
                        $('.' + currenttablename+" #dateTo").attr('readonly', false);
                        if (dataObject.length == 0) {
                            if (templateObject.data.apiParams == undefined) {
                              $('.fullScreenSpin').css('display', 'none'); resolve([]);
                            }
                            let params = cloneDeep(templateObject.apiParams.get());
                            for (let i = 0; i < params.length; i++) {
                                if (params[i] == 'ignoredate') {
                                    params[i] = true;
                                } else if (params[i] == 'dateFrom') {
                                    params[i] = prevMonth11Date
                                } else if (params[i] == 'dateTo') {
                                    params[i] = toDate
                                } else if (params[i] == 'limitFrom') {
                                    params[i] = 0
                                } else if (params[i] == 'limitCount') {
                                    params[i] = initialReportLoad
                                } else if (params[i] == 'deleteFilter') {
                                    params[i] = deleteFilter
                                }else if (params[i] == 'contactid') {
                                    params[i] = templateObject.data.contactid;
                                }else if(params[i] == 'productID') {
                                    params[i] = templateObject.data.productID;
                                }else if(params[i] == 'department') {
                                    params[i] = templateObject.data.department;
                                }else if(params[i] == 'typefilter') {
                                    params[i] = templateObject.data.typefilter;
                                }
                            }
                            if(templateObject.data.apiName) {
                                templateObject.data.apiName.apply(that, params).then(function (dataReturn) {
                                    addVS1Data(indexDBName, JSON.stringify(dataReturn)).then(function () {
                                        resolve(dataReturn)
                                    })
                                }).catch(function (e) {
                                    resolve([])
                                    $('.fullScreenSpin').css('display', 'none');
                                })
                            } else {
                                resolve([])
                                $('.fullScreenSpin').css('display', 'none');
                            }
                        } else {
                            let data = JSON.parse(dataObject[0].data);
                            resolve(data)
                        }
                    }).catch(function (error) {
                        let params = cloneDeep(templateObject.apiParams.get());
                        for (let i = 0; i < params.length; i++) {
                            if (params[i] == 'ignoredate') {
                                params[i] = true;
                            } else if (params[i] == 'dateFrom') {
                                params[i] = prevMonth11Date
                            } else if (params[i] == 'dateTo') {
                                params[i] = toDate
                            } else if (params[i] == 'limitFrom') {
                                params[i] = 0
                            } else if (params[i] == 'limitCount') {
                                params[i] = initialReportLoad
                            } else if (params[i] == 'deleteFilter') {
                                params[i] = deleteFilter
                            }else if (params[i] == 'contactid') {
                                params[i] = templateObject.data.contactid;
                            }else if(params[i] == 'productID') {
                                params[i] = templateObject.data.productID;
                            }else if(params[i] == 'department') {
                                params[i] = templateObject.data.department;
                            }else if(params[i] == 'typefilter') {
                                params[i] = templateObject.data.typefilter;
                            }
                        }
                        templateObject.data.apiName.apply(that, params).then(function (dataReturn) {
                            addVS1Data(indexDBName, JSON.stringify(dataReturn)).then(function () {
                                resolve(dataReturn)
                            })
                        }).catch(function (error) {
                            $('.fullScreenSpin').css('display', 'none');
                        })
                    })
                }
            }
        })

    }

    templateObject.getFilteredData = async function (params) {
        $('.fullScreenSpin').css('display', 'inline-block');
        if (templateObject.data.apiParams == undefined) {
            $('.fullScreenSpin').css('display', 'none');
            return
        }
        let apiParams = cloneDeep(templateObject.apiParams.get());
        for (let i = 0; i < apiParams.length; i++) {
            if (apiParams[i] == 'ignoredate') {
                apiParams[i] = params[2]
            } else if (apiParams[i] == 'dateFrom') {
                apiParams[i] = params[0]
            } else if (apiParams[i] == 'dateTo') {
                apiParams[i] = params[1]
            } else if (apiParams[i] == 'limitCount') {
                apiParams[i] = initialDatatableLoad
            } else if (apiParams[i] == 'limitFrom') {
                apiParams[i] = 0
            } else if (apiParams[i] == 'deleteFilter') {
                // if ($('.btnCheckBetween').hasClass('btnViewDeleted')) {
                //      apiParams[i] = false
                // } else {
                //     apiParams[i] = true
                //  }
                if (params[4]) {
                    apiParams[i] = false
                } else {
                    if ($('.btnCheckBetween').hasClass('btnViewDeleted')) {
                        apiParams[i] = false
                    } else {
                        apiParams[i] = true
                    }
                }
            }else if (params[i] == 'productID') {
                apiParams[i] = templateObject.data.productID;
            }else if (params[i] == 'contactid') {
                apiParams[i] = params[3]
            }
        }
        let that = templateObject.data.service;
        templateObject.data.apiName.apply(that, apiParams).then(function (data) {
            addVS1Data(indexDBName, JSON.stringify(data)).then(async function () {
               await templateObject.displayTableData(data);
            })
        })
    }
    templateObject.displayTableData = async function (data, isEx = false) {

        var splashDataArray = new Array();
        let deleteFilter = false;
        if (data != [] && data.length != 0) {
            if (data.Params) {
                if (data.Params?.Search?.replace(/\s/g, "") == "") {
                    deleteFilter = true
                } else {
                    deleteFilter = false
                }

                if (data.Params.IgnoreDates == true) {
                  $('.' + currenttablename+" #dateFrom").attr("readonly", true);
                  $('.' + currenttablename+" #dateTo").attr("readonly", true);
                }else{
                  $('.' + currenttablename+" #dateFrom").attr("readonly", false);
                  $('.' + currenttablename+" #dateTo").attr("readonly", false);
                  $('.' + currenttablename+" #dateFrom").val(data.Params.DateFrom != '' ? moment(data.Params.DateFrom).format("DD/MM/YYYY") : data.Params.DateFrom);
                  $('.' + currenttablename+" #dateTo").val(data.Params.DateTo != '' ? moment(data.Params.DateTo).format("DD/MM/YYYY") : data.Params.DateTo);

                }
            }else{
              function allAreEqual(array) {
                //array.forEach(function(item) {
                  array.map((item) => {//unfinisdhed code

                });

                return result;
              };
              //allAreEqual(data);
            }
            if (isEx == false) {
                for (let i = 0; i < data[indexDBLowercase]?.length; i++) {

                    let dataList = templateObject.data.datahandler(data[indexDBLowercase][i]);
                    let typeList = []; //
                    if(dataList.length != 0) {
                      if(templateObject.data.isMultipleRows){
                          dataList.map((item) => {
                              splashDataArray.push(item);
                          })
                      }else{
                          splashDataArray.push(dataList);
                      }
                      for (let i = 0; i < dataList.length; i++) { // carina
                        if (typeof dataList[i] === 'string' && dataList[i].startsWith(Currency)) {
                            typeList.push('number');
                        } else {
                            typeList.push(typeof(dataList[i]));
                        }
                      }
                      templateObject.tabledatalists.set(typeList.slice(0, -1));

                    }

                    templateObject.transactiondatatablerecords.set(splashDataArray);
                }
            } else {
                let lowercaseData = templateObject.data.exIndexDBName;
                for (let i = 0; i < data[lowercaseData].length; i++) {
                    let dataList = templateObject.data.exdatahandler(data[lowercaseData][i])
                    if(dataList.length != 0) {
                      if(templateObject.data.isMultipleRows){
                          dataList.map((item) => {
                              splashDataArray.push(item);
                          })
                      }else{
                          splashDataArray.push(dataList);
                      }
                    }
                    templateObject.transactiondatatablerecords.set(splashDataArray);
                }

            }

            if (templateObject.transactiondatatablerecords.get()) {
                setTimeout(function () {
                    MakeNegative();
                }, 100);
            }
        } else if (templateObject.data.isCustom == true) {
            setTimeout(()=>{
                let dataList = templateObject.data.datahandler('')
                        if(dataList.length != 0) {
                          if(templateObject.data.isMultipleRows){
                              dataList.map((item) => {
                                  splashDataArray.push(item);
                              })
                          }else{
                              splashDataArray.push(dataList);
                          }
                        }
                        templateObject.transactiondatatablerecords.set(splashDataArray);
            },2000)
        }

        let colDef = [];
        let acolDef = [];
        let items = [];
        let aitems = [];

        let checkColumnOrderable = {};
        if(templateObject.data.isselection == true){
            checkColumnOrderable = {
              colReorder: {
                  fixedColumnsLeft: 1
              },
            }
        };

        const tabledraw = (pageType='simple_numbers') => {
            $('#' + currenttablename).DataTable({
                dom: 'BRlfrtip',
                data: splashDataArray,
                // "sDom": "<'row'><'row'<'col-sm-12 col-md-6'f><'col-sm-12 col-md-6'l>r>t<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>B",
                // columns: columns,
                // aoColumns:acolDef,
                //columns: acolDef,
                columnDefs: colDef,
               'select': {
                  'style': 'multi'
               },
                // fixedColumns: true ,
                // "ordering": false,
                // deferRender: true,
                buttons: [{
                    extend: 'csvHtml5',
                    text: '',
                    download: 'open',
                    className: "btntabletocsv hiddenColumn",
                    filename: templateObject.data.exportfilename,
                    orientation: 'portrait',
                    exportOptions: {
                        columns: ':visible',
                        stripHtml: false
                    }
                }, {
                    extend: 'print',
                    download: 'open',
                    className: "btntabletopdf hiddenColumn",
                    text: '',
                    title: templateObject.data.exportfilename,
                    filename: templateObject.data.exportfilename,
                    exportOptions: {
                        columns: ':visible',
                        stripHtml: false
                    },

                },
                    {
                        extend: 'excelHtml5',
                        title: '',
                        download: 'open',
                        className: "btntabletoexcel hiddenColumn",
                        filename: templateObject.data.exportfilename,
                        orientation: 'portrait',
                        exportOptions: {
                            columns: ':visible',
                            format: {
                              body: function ( data, row, column ) {
                                  if(data.toString().includes('<span style="display:none;">true</span>')){
                                      var res = 'True';
                                      data = res;
                                  }else if(data.toString().includes('<span style="display:none;">false</span>')){
                                      var res = 'False';
                                      data = res;
                                  }else{
                                    if(data.toString().includes("</span>")){
                                      var res = data.split("</span>");
                                      data = res[1];
                                    }
                                  }
                                  return column === 1 ? data.toString().replace(/<.*?>/ig, ""): data;
                              }
                          }
                        },
                    }
                ],
                // "autoWidth": false, // might need this
                // fixedColumns: true,
                select: true,
                destroy: true,
                colReorder: true,
                ...checkColumnOrderable,
                pageLength: initialDatatableLoad,
                "bLengthChange": isShowSelect,
                lengthMenu: [[initialDatatableLoad, -1],[initialDatatableLoad, "All"]],
                info: true,
                responsive: false,
                pagingType: pageType,
                "order": templateObject.data.orderby ? eval(templateObject.data.orderby):[[1, "asc"]],
                "autoWidth": false,
                action: function () {
                    $('#' + currenttablename).DataTable().ajax.reload();
                },
                "fnCreatedRow": function( nRow, aData, iDataIndex ) {
                    $(nRow).attr('id', templateObject.data.attRowID ? aData[templateObject.data.attRowID]:aData[0]);
                },
                "fnDrawCallback": function (oSettings) {
                    $('.paginate_button.page-item').removeClass('disabled');
                    $('#' + currenttablename + '_ellipsis').addClass('disabled');
                    if (oSettings._iDisplayLength == -1) {
                        if (oSettings.fnRecordsDisplay() > 150) {

                        }
                    } else {

                    }
                    if (oSettings.fnRecordsDisplay() < initialDatatableLoad) {
                        $('.paginate_button.page-item.next').addClass('disabled');
                    }

                    $('.paginate_button.next:not(.disabled)', this.api().table().container()).on('click', function () {
                        $('.fullScreenSpin').css('display', 'inline-block');
                        //var splashArrayCustomerListDupp = new Array();
                        let dataLenght = oSettings._iDisplayLength;
                        let customerSearch = $('#' + currenttablename + '_filter input').val();

                        var dateFrom = new Date($('.' + currenttablename+" #dateFrom").datepicker("getDate"));
                        var dateTo = new Date($('.' + currenttablename+" #dateTo").datepicker("getDate"));

                        let formatDateFrom = dateFrom.getFullYear() + "-" + (dateFrom.getMonth() + 1) + "-" + dateFrom.getDate();
                        let formatDateTo = dateTo.getFullYear() + "-" + (dateTo.getMonth() + 1) + "-" + dateTo.getDate();


                        let params = cloneDeep(templateObject.apiParams.get());
                        for (let i = 0; i < params.length; i++) {
                            if (params[i] == 'ignoredate') {
                                params[i] = data.Params && data.Params.IgnoreDates;
                            } else if (params[i] == 'dateFrom') {
                                params[i] = formatDateFrom
                            } else if (params[i] == 'dateTo') {
                                params[i] = formatDateTo
                            } else if (params[i] == 'limitFrom') {
                                params[i] = oSettings.fnRecordsDisplay()
                            } else if (params[i] == 'limitCount') {
                                params[i] = initialDatatableLoad
                            } else if (params[i] == 'deleteFilter') {
                                params[i] = deleteFilter
                            }else if (params[i] == 'contactid') {
                                params[i] = templateObject.data.contactid;
                            }else if (params[i] == 'productID') {
                                params[i] = templateObject.data.productID;
                            }else if(params[i] == 'includecustomer') {
                              let chkshowcustomers_toggle_value = $("#chkshowcustomers_toggle").is(":checked");
                              if(chkshowcustomers_toggle_value == true){
                                params[i] = 'includCustomer';
                              }
                                // params[i] = templateObject.data.productID
                            }
                        }
                        let that = templateObject.data.service;
                        templateObject.data.apiName.apply(that, params).then(function (dataObjectnew) {
                            for (let j = 0; j < dataObjectnew[indexDBLowercase].length; j++) {
                                var dataList = templateObject.data.datahandler(dataObjectnew[indexDBLowercase][j])
                                splashDataArray.push(dataList);
                            }
                            // let uniqueChars = [...new Set(splashDataArray)];
                            var uniqueArrayOfArrays = Array.from(new Set(splashDataArray.map(JSON.stringify)), JSON.parse);
                            templateObject.transactiondatatablerecords.set(uniqueArrayOfArrays);
                            var datatable = $('#' + currenttablename).DataTable();
                            if (uniqueArrayOfArrays.length > 50) {
                                datatable.destroy();
                                tabledraw('full_numbers');
                            } else {
                                datatable.clear();
                                datatable.rows.add(uniqueArrayOfArrays);
                                datatable.draw(false);
                            }
                            setTimeout(function () {
                                $('#' + currenttablename).dataTable().fnPageChange('last');
                            }, 400);

                            $('.fullScreenSpin').css('display', 'none');
                        }).catch(function (err) {
                            $('.fullScreenSpin').css('display', 'none');
                        })
                    });
                    $('.paginate_button.last:not(.disabled)', this.api().table().container()).on('click', function () {
                        $('.fullScreenSpin').css('display', 'inline-block');
                        var dateFrom = new Date($('.' + currenttablename+" #dateFrom").datepicker("getDate"));
                        var dateTo = new Date($('.' + currenttablename+" #dateTo").datepicker("getDate"));

                        let formatDateFrom = moment(dateFrom).format('YYYY-MM-DD');
                        let formatDateTo = moment(dateTo).format('YYYY-MM-DD');


                        let params = cloneDeep(templateObject.apiParams.get());
                        for (let i = 0; i < params.length; i++) {
                            if (params[i] == 'ignoredate') {
                                params[i] = data.Params && data.Params.IgnoreDates;
                            } else if (params[i] == 'dateFrom') {
                                params[i] = formatDateFrom
                            } else if (params[i] == 'dateTo') {
                                params[i] = formatDateTo
                            } else if (params[i] == 'limitFrom') {
                                params[i] = 0
                            } else if (params[i] == 'limitCount') {
                                params[i] = 'All'
                            } else if (params[i] == 'deleteFilter') {
                                params[i] = deleteFilter
                            }else if (params[i] == 'contactid') {
                                params[i] = templateObject.data.contactid;
                            }else if (params[i] == 'productID') {
                                params[i] = templateObject.data.productID;
                            }else if(params[i] == 'includecustomer') {
                              let chkshowcustomers_toggle_value = $("#chkshowcustomers_toggle").is(":checked");
                              if(chkshowcustomers_toggle_value == true){
                                params[i] = 'includCustomer';
                              }
                            }
                        }
                        let that = templateObject.data.service;
                        templateObject.data.apiName.apply(that, params).then(function (dataObjectnew) {
                            splashDataArray = new Array();
                            for (let j = 0; j < dataObjectnew[indexDBLowercase].length; j++) {
                                var dataList = templateObject.data.datahandler(dataObjectnew[indexDBLowercase][j])
                                splashDataArray.push(dataList);
                            }
                            var uniqueArrayOfArrays = Array.from(new Set(splashDataArray.map(JSON.stringify)), JSON.parse);
                            templateObject.transactiondatatablerecords.set(uniqueArrayOfArrays);
                            var datatable = $('#' + currenttablename).DataTable();
                            if (uniqueArrayOfArrays.length > 50) {
                                datatable.destroy();
                                tabledraw('full_numbers');
                            } else {
                                datatable.clear();
                                datatable.rows.add(uniqueArrayOfArrays);
                                datatable.draw(false);
                            }
                            setTimeout(function () {
                                $('#' + currenttablename).dataTable().fnPageChange('last');
                            }, 400);

                            $('.fullScreenSpin').css('display', 'none');
                        }).catch(function (err) {
                            $('.fullScreenSpin').css('display', 'none');
                        })
                    });
                    setTimeout(function () {
                        MakeNegative();
                    }, 100);
                },
                language: { search: "", searchPlaceholder: "Search List..." },
                "fnInitComplete": function (oSettings) {

                      if(templateObject.data.islistfilter == true){
                        $(`<div class="btn-group divDropdownFilter" style="margin-left: 14px; height: 34px;">
                        <button type="button" class="btn btn-primary btnDropdownFilter" id="btnDropdownFilter" name="btnDropdownFilter" style="padding: 4.2px 14px;" tablename="${currenttablename}" data-toggle='modal' data-target="#filterModal_${currenttablename}"><i class="fas fa-list-ul" style="margin-right: 5px;"></i>Filter</button>
                        <button class="btn btn-primary dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-expanded="false" type="button"></button>
                            <div class="dropdown-menu">
                                <div id="savedFilterItem1" class="dropdown-item d-flex align-items-center justify-content-between px-3">
                                    <span class="btnFilterOption pointer mr-2" filter-id="1">${templateObject.filterTitleOne.get()}</span>
                                    <div>
                                        <button class="btn btn-sm btn-primary btnEditFilter" style="margin: 0 2px 0 0 !important; padding: 0px 5px !important;" filter-id="1" tablename="${currenttablename}" data-toggle='modal' data-target="#customFilterModal_${currenttablename}"><i class="fa fa-edit" style="margin-right: -3px;"></i></button>
                                        <button class="btn btn-sm btn-danger btnRemoveFilter" style="margin-top: 0px !important; padding: 0px 5px !important;" filter-id="1"><i class="fa fa-remove"></i></button>
                                    </div>
                                </div>
                                <div id="savedFilterItem2" class="dropdown-item d-flex align-items-center justify-content-between px-3">
                                    <span class="btnFilterOption pointer mr-2" filter-id="2">${templateObject.filterTitleTwo.get()}</span>
                                    <div>
                                        <button class="btn btn-sm btn-primary btnEditFilter" style="margin: 0 2px 0 0 !important; padding: 0px 5px !important;" filter-id="2" tablename="${currenttablename}" data-toggle='modal' data-target="#customFilterModal_${currenttablename}"><i class="fa fa-edit" style="margin-right: -3px;"></i></button>
                                        <button class="btn btn-sm btn-danger btnRemoveFilter" style="margin-top: 0px !important; padding: 0px 5px !important;" filter-id="2"><i class="fa fa-remove"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>`).insertAfter('#' + currenttablename + '_filter');
                        if (templateObject.filterTitleOne.get() == '') {
                            $("#savedFilterItem1").addClass('d-none');
                            $("#savedFilterItem1").removeClass('d-flex');
                        }
                        if (templateObject.filterTitleTwo.get() == '') {
                            $("#savedFilterItem2").addClass('d-none');
                            $("#savedFilterItem2").removeClass('d-flex');
                        }
                      };

                      if(templateObject.data.showCameraButton == true){
                        $("<a class='btn btn-primary scanProdServiceBarcodePOP' href='' id='scanProdServiceBarcodePOP' role='button' style='margin-left: 8px; height:32px;padding: 4px 10px;'><i class='fas fa-camera'></i></a>").insertAfter('#' + currenttablename + '_filter');
                      };

                      if(templateObject.data.viewConvertedButton == true){
                         $("<button class='btn btn-primary btnViewConverted' type='button' id='btnViewConverted' style='padding: 4px 10px; font-size: 16px; margin-left: 14px !important;background-color: #1cc88a !important;border-color: #1cc88a!important;'><i class='fa fa-trash' style='margin-right: 5px'></i>View Converted</button>").insertAfter('#' + currenttablename + '_filter');
                      };
                      if(templateObject.data.hideConvertedButton == true){
                        $("<button class='btn btn-danger btnHideConverted' type='button' id='btnHideConverted' style='padding: 4px 10px; font-size: 16px; margin-left: 14px !important;background-color: #f6c23e !important;border-color: #f6c23e!important;'><i class='far fa-check-circle' style='margin-right: 5px'></i>Hide Converted</button>").insertAfter('#' + currenttablename + '_filter');
                      };

                      if(templateObject.data.showPlusButtonCRM == true){
                        $(`<div class="btn-group btnNav btnAddLineGroup " style="height:35px; margin-left: 14px;">
                            <button type="button" class="btn btn-primary btnAddNew btnAddLine" id="btnAddLine" style="margin-right: 0px;"><i class='fas fa-plus'></i></button>
                            <button class="btn btn-primary dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-expanded="false" type="button"></button>
                            <div class="dropdown-menu">
                                <a class="dropdown-item btnAddLineTask pointer" id="btnAddLineTask">+ Task</a>
                            </div>
                        </div>`).insertAfter('#' + currenttablename + '_filter');
                      }
                      if(templateObject.data.showPlusButton == true){
                        //$("<button class='btn btn-primary btnAddNew "+templateObject.data.showPlusButtonClass+"' id='"+templateObject.data.showPlusButtonClass+"' name='"+templateObject.data.showPlusButtonClass+"'  type='button' style='padding: 4px 10px; font-size: 16px; margin-left: 12px !important;'><i class='fas fa-plus'></i></button>").insertAfter('#' + currenttablename + '_filter');
                        if (templateObject.data.plusButtonText) {
                           $("<button class='btn btn-primary btnAddNew "+templateObject.data.showPlusButtonClass+"' id='"+templateObject.data.showPlusButtonClass+"' name='"+templateObject.data.showPlusButtonClass+"' data-toggle='modal' data-target='"+templateObject.data.showModalID+"' type='button' style='padding: 4px 10px; font-size: 16px; margin-left: 12px !important;'>" + templateObject.data.plusButtonText + "</button>").insertAfter('#' + currenttablename + '_filter');

                       } else {
                           $("<button class='btn btn-primary btnAddNew "+templateObject.data.showPlusButtonClass+"' id='"+templateObject.data.showPlusButtonClass+"' name='"+templateObject.data.showPlusButtonClass+"' type='button' style='padding: 4px 10px; font-size: 16px; margin-left: 12px !important;'><i class='fas fa-plus'></i></button>").insertAfter('#' + currenttablename + '_filter');
                       }
                      };
                      if (data.Params) {
                        if (data.Params?.Search?.replace(/\s/g, "") == "" || data.Params?.AllocType?.replace(/\s/g, "") == "") {
                            $("<button class='btn btn-danger btnCheckBetween btnHideDeleted' type='button' id='btnHideDeleted' style='padding: 4px 10px; font-size: 16px; margin-left: 14px !important;'><i class='far fa-check-circle' style='margin-right: 5px'></i>"+hideViewDeletedLabel+"</button>").insertAfter('#' + currenttablename + '_filter');
                        } else {
                          if ((data.Params?.Search == "IsBill = true and IsCheque != true") || (data.Params?.Search == "AccountType IN ('Bank')") || (data.Params?.Search == "AND TransHeader.AddToManifest='T'") || (data.Params?.Search == "AccountType IN ('LTLIAB')") || (data.Params?.Search == "AccountType IN ('EXP')") || (data.Params?.Search == "AccountType IN ('AP')") || (data.Params?.Search == "AccountType IN ('OCLIAB')") || (data.Params?.Search == "AccountType IN ('EXEXP')") || (data.Params?.Search == "Completed=true")) {//Josue//Samet//Carina
                            $("<button class='btn btn-danger btnCheckBetween btnHideDeleted' type='button' id='btnHideDeleted' style='padding: 4px 10px; font-size: 16px; margin-left: 14px !important;'><i class='far fa-check-circle' style='margin-right: 5px'></i>"+hideViewDeletedLabel+"</button>").insertAfter('#' + currenttablename + '_filter');
                          }else{
                            $("<button class='btn btn-primary btnCheckBetween btnViewDeleted' type='button' id='btnViewDeleted' style='padding: 4px 10px; font-size: 16px; margin-left: 14px !important;'><i class='fa fa-trash' style='margin-right: 5px'></i>"+activeViewDeletedLabel+"</button>").insertAfter('#' + currenttablename + '_filter');
                          }
                        };
                        if (data.Params?.Objclassname == "TProspectList"){
                          if (data.Params?.Search.includes('Customer != true')){
                            $('.chkshowcustomers').attr("checked", false);
                          }else{
                            $('.chkshowcustomers').attr("checked", true);
                          }
                        };
                    } else {
                        // const allEqual = data.every(val => val.Active === true);
                        $("<button class='btn btn-primary btnCheckBetween btnViewDeleted' type='button' id='btnViewDeleted' style='padding: 4px 10px; font-size: 16px; margin-left: 14px !important;'><i class='fa fa-trash' style='margin-right: 5px'></i>"+activeViewDeletedLabel+"</button>").insertAfter('#' + currenttablename + '_filter');
                    }
                    $("<button class='btn btn-primary btnRefreshTable' type='button' id='btnRefreshTable' style='padding: 4px 10px; font-size: 16px; margin-left: 14px !important;'><i class='fas fa-search-plus' style='margin-right: 5px'></i>Search</button>").insertAfter('#' + currenttablename + '_filter');
                    if(typeof templateObject.data.callBack == 'function'){//Alexei
                      templateObject.data.callBackFunc();
                    };
                    /*
                    setTimeout(function() {
                     $('#' + currenttablename).DataTable().ajax.reload();
                     $('#' + currenttablename).columns.adjust().draw();
                   }, 3000);
                   */
                },
                "fnInfoCallback": function (oSettings, iStart, iEnd, iMax, iTotal, sPre) {
                    let countTableData = 0;
                    if (data.Params) {
                        countTableData = data.Params.Count || 0; //get count from API data
                    } else {
                        countTableData = splashDataArray.length
                    }

                    return 'Showing ' + iStart + " to " + iEnd + " of " + countTableData;
                },

            }).on('page', function () {
                setTimeout(function () {
                    MakeNegative();
                }, 100);
            }).on('column-reorder', function () {

            }).on('length.dt', function (e, settings, len) {
                $(".fullScreenSpin").css("display", "inline-block");
                let dataLenght = settings._iDisplayLength;
                if (dataLenght == -1) {
                    if (settings.fnRecordsDisplay() > initialDatatableLoad) {
                        $(".fullScreenSpin").css("display", "none");
                    } else {
                        $(".fullScreenSpin").css("display", "none");
                    }
                } else {
                    $(".fullScreenSpin").css("display", "none");
                }
                setTimeout(function () {
                    MakeNegative();
                }, 100);
            })

            $(".fullScreenSpin").css("display", "none");

            setTimeout(async function () {
                await $('div.dataTables_filter input').addClass('form-control form-control-sm');
                if(templateObject.isOverviewPage.get() == false) {
                    $('#' + currenttablename+'_filter .form-control-sm').focus();
                    $('#' + currenttablename+'_filter .form-control-sm').trigger("input");
                }
              }, 0);
            // setTimeout(function () {
            //   for (let c = 0; c < acolDef.length; c ++) {
            //       let activeHeaderClass = acolDef[c].class;
            //       let activeHeaderWitdh = acolDef[c].sWidth;
            //       $('.'+activeHeaderClass).css('width',activeHeaderWitdh);
            //   }
            //
            //   $('.colComment').css('width','262px');
            // }, 1000);
        }
        /*
        function getColDef() {
            let items = templateObject.data.tableheaderrecords;
            for (let i = 0; i < $(".displaySettings").length; i ++) {
                var $tblrow = $($(".displaySettings")[i]);
                var fieldID = $tblrow.attr("custid") || 0;
                var colTitle = $tblrow.find(".divcolumn").text() || "";
                var colWidth = $tblrow.find(".custom-range").val() || 100;
                var colthClass = $tblrow.find(".divcolumn").attr("valueupdate") || "";
                var colHidden = false;
                if ($tblrow.find(".custom-control-input").is(":checked")) {
                    colHidden = true;
                } else {
                    colHidden = false;
                }
                let lineItemObj = {
                    index: parseInt(fieldID),
                    label: colTitle,
                    active: colHidden,
                    width: parseFloat(colWidth),
                    class:colthClass,
                    display: true
                };

                for (let i = 0; i < items.length; i ++) {
                    let tLabel = items[i]?.label?.indexOf('#') >= 0 ? items[i].label.substr(1) : items[i].label;
                    let rLabel = lineItemObj?.label?.indexOf('#') >= 0 ? lineItemObj.label.substr(1) : lineItemObj.label;
                    if (tLabel == rLabel) {
                        items[i].width = lineItemObj.width;
                        if (lineItemObj.active) {
                            if (items[i].label.indexOf('#') >= 0) {
                                items[i].label = items[i].label.substr(1);
                            }


                        } else {
                            if (items[i].label.indexOf('#') < 0) {
                                items[i].label = '#' + items[i].label;
                            }
                        }
                    }
                }
            }

            if (items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                    let item = {
                        targets:i,
                        className:items[i]?.label?.includes('#') == false ? items[i].class : items[i].class + ' hiddenColumn',
                        // className: items[i].class,
                        title:items[i].label,
                        width:items[i].width
                    };

                    let aitem = {
                        targets:i,
                        width:items[i].width
                    };

                    acolDef.push(aitem);
                    colDef.push(item);

                }
                templateObject.columnDef.set(colDef)
                tabledraw();
                tableResize();
            } else {
                setTimeout(()=>{
                    getColDef();
                }, 1000);
            }

        }*/

        async function getColDef() {
            let items =await templateObject.displayfields.get();
            if (items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                  let item = '';
                   item = {
                      targets: i,
                      // visible: items[i].active,
                      className: items[i].active? items[i].class : items[i].class + " hiddenColumn",
                      orderable: items[i].display==true && items[i].custfieldlabel !=''||false,
                      // className: items[i].class,
                      title: items[i].custfieldlabel,
                      width: items[i].width,
                      "createdCell": function (td, cellData, rowData, row, col) {
                        if(templateObject.data.islistfilter){
                          let getOverDueColor = $(td).closest("tr").find('.chkBox').attr('overduetype');
                          $(td).closest("tr").find('.colOverdueDays').addClass(getOverDueColor);
                       }

                       if(templateObject.data.pan){
                         let tableRowID = $(td).closest.closest("tr").attr("id");
                         let chkBoxId = "t-" + templateObject.data.pan + "-" + tableRowID;
                         $(td).closest("tr").find('.chkServiceCard').attr("id", chkBoxId);
                       }
                      }
                  };

                  colDef.push(item);
                }

               //  if(templateObject.data.isselection == true){
                // updatedItem = {
                //      targets: 0,
                //      visible: true,
                //      className: 'colChkBox pointer',
                //      orderable: false,
                //      width: "15px",
                //      'checkboxes': {
                //         'selectRow': true
                //      }
                //  };
               //   //colDef.push(item);
               // };
                //colDef[0] = updatedItem;
                templateObject.columnDef.set(colDef)
                tabledraw();
                tableResize();
            } else {
                setTimeout(()=>{
                    getColDef();
                }, 1000);
            }

        }
        getColDef();

        // setTimeout(() => {
        //     window.dispatchEvent(new Event('resize'));
        // }, 1000);

    }

    if (currenttablename == 'tblHistoryUpcoming') window.displayTableData = this.displayTableData;
    window.displayFilterFlag = 0;
    window.displayEditFilterFlag = 0;

    $(".divDisplaySettings").on("hide.bs.modal", function(){
        // setTimeout(() => {
        //     window.dispatchEvent(new Event('resize'));
        // }, 500);
        // your function after closing modal goes here
    })
    if(templateObject.data.isselection == true){
    $(document).ready(function () {
    $('#' + currenttablename+" #dateTo").on("change paste keyup", function() {
         $('.fullScreenSpin').css('display', 'inline-block');
         $('.' + currenttablename+" #dateFrom").attr('readonly', false);
         $('.' + currenttablename+" #dateTo").attr('readonly', false);
         var dateFrom = new Date($('.' + currenttablename+" #dateFrom").datepicker("getDate"));
         var dateTo = new Date($('.' + currenttablename+" #dateTo").datepicker("getDate"));
         let contactID = templateObject.data.contactid ||'';
         let formatDateFrom = dateFrom.getFullYear() + "-" + (dateFrom.getMonth() + 1) + "-" + dateFrom.getDate();
         let formatDateTo = dateTo.getFullYear() + "-" + (dateTo.getMonth() + 1) + "-" + dateTo.getDate();

         var formatDate = dateTo.getDate() + "/" + (dateTo.getMonth() + 1) + "/" + dateTo.getFullYear();
         if (($('.' + currenttablename+" #dateFrom").val().replace(/\s/g, '') == "") && ($('.' + currenttablename+" #dateFrom").val().replace(/\s/g, '') == "")) {

         } else {
             let params = [formatDateFrom, formatDateTo, false,contactID];
             templateObject.getFilteredData(params)
         }
    });

    $('#' + currenttablename+" #dateFrom").on("change paste keyup", function() {
         $('.fullScreenSpin').css('display', 'inline-block');
         $('.' + currenttablename+" #dateFrom").attr('readonly', false);
         $('.' + currenttablename+" #dateTo").attr('readonly', false);
         var dateFrom = new Date($('.' + currenttablename+" #dateFrom").datepicker("getDate"));
         var dateTo = new Date($('.' + currenttablename+" #dateTo").datepicker("getDate"));
         let contactID = templateObject.data.contactid ||'';
         let formatDateFrom = dateFrom.getFullYear() + "-" + (dateFrom.getMonth() + 1) + "-" + dateFrom.getDate();
         let formatDateTo = dateTo.getFullYear() + "-" + (dateTo.getMonth() + 1) + "-" + dateTo.getDate();

         var formatDate = dateTo.getDate() + "/" + (dateTo.getMonth() + 1) + "/" + dateTo.getFullYear();
         if (($('.' + currenttablename+" #dateFrom").val().replace(/\s/g, '') == "") && ($('.' + currenttablename+" #dateFrom").val().replace(/\s/g, '') == "")) {

         } else {
             let params = [formatDateFrom, formatDateTo, false, contactID];
             templateObject.getFilteredData(params)
         }
    });
 /* Remove manual sortable
    $('#'+currenttablename+" tbody").sortable({
      start: function (e, ui) {
          var elements = ui.item.siblings('.selected.hidden').not('.ui-sortable-placeholder');
          ui.item.data('items', elements);
      },
      update: function (e, ui) {
          ui.item.after(ui.item.data("items"));
      },
      stop: function (e, ui) {
          ui.item.siblings('.selected').removeClass('hidden');
          $('tr.selected').removeClass('selected');
      }
    });
    */

    $('#'+currenttablename).on('column-resize', function(e, settings, column) {
        // $('#'+currenttablename+'.JColResizer.JCLRFlex').attr('style', 'width: auto!important')
    });

  });
};
let url = FlowRouter.current().path;//Hardwin
    if (url.indexOf("?dateFrom") > 0 || url.indexOf("&dateFrom") > 0) {
        url = new URL(window.location.href);
        let getDateFrom = url.searchParams.get("dateFrom");
        let getLoadDate = url.searchParams.get("dateTo");
        let ignoreDates = url.searchParams.get("ignoreDate");
        if( typeof getDateFrom === undefined || getDateFrom == "" || getDateFrom === null){
            let currentUrl = FlowRouter.current().queryParams;
            getDateFrom = currentUrl.dateFrom
            getLoadDate = currentUrl.dateTo
            ignoreDates = currentUrl.ignoreDate
        }
        $("#dateFrom").datepicker('setDate', moment(getDateFrom).format('DD/MM/YYYY'));
        $("#dateTo").datepicker('setDate', moment(getLoadDate).format('DD/MM/YYYY'));
        let paramIgnoreDates = false;
        if (ignoreDates == 'true') {
            $('.' + currenttablename+" #dateFrom").attr('readonly', true);
            $('.' + currenttablename+" #dateTo").attr('readonly', true);
            paramIgnoreDates = true;
        } else {
            $('.' + currenttablename+" #dateFrom").attr('readonly', false);
            $('.' + currenttablename+" #dateTo").attr('readonly', false);
        }
        let contactID = templateObject.data.contactid ||'';
        let params = [getDateFrom, getLoadDate, paramIgnoreDates, contactID, 'deleteFilter'];
        templateObject.getFilteredData(params);
    };

    templateObject.getAllData= async function () {//MArtin
        return new Promise((resolve, reject) => {
            if (templateObject.data.istransaction == false) {
                let that = templateObject.data.service;
                let params = ['All', 0, false];
                if(templateObject.data.apiName) {
                templateObject.data.apiName.apply(that, params).then(function (dataReturn) {
                    resolve(dataReturn)
                })
                }
            } else {
                let that = templateObject.data.service;
                let params = ['', '', true, 'All', 0, false];
                if(templateObject.data.apiName) {
                    templateObject.data.apiName.apply(that, params).then(function (dataReturn) {
                    resolve(dataReturn)
                    })
                }
            }
        })
    };

    $(document).on('click', `.${templateObject.data.tablename}_btnEXAllPage`, async function(){
        $('.fullScreenSpin').css('display','inline-block');
        await clearData(templateObject.data.indexeddbname);
        tableData= await templateObject.getAllData();
        templateObject.displayTableData(tableData)
        setTimeout(async () => {
            let tablename = templateObject.data.tablename;
            jQuery('#'+tablename+'_wrapper .dt-buttons .btntabletoexcel').click();
            $("#ExportModal").modal('hide');
            await clearData(templateObject.data.indexeddbname);
            tableData= await templateObject.getTableData();
            templateObject.displayTableData(tableData)
            $('.fullScreenSpin').css('display','none');
        }, 100);
    })

    $(document).on('click', `.${templateObject.data.tablename}_btnPrintAllPage`, async function(){
        $('.fullScreenSpin').css('display','inline-block');
        await clearData(templateObject.data.indexeddbname);
        tableData= await templateObject.getAllData();
        templateObject.displayTableData(tableData)
        setTimeout(async () => {
            let tablename = templateObject.data.tablename;
            jQuery('#'+tablename+'_wrapper .dt-buttons .btntabletopdf').click();
            $("#ExportModal").modal('hide');
            await clearData(templateObject.data.indexeddbname);
            tableData= await templateObject.getTableData();
            templateObject.displayTableData(tableData)
            $('.fullScreenSpin').css('display','none');
        }, 100);
    })

    $(document).on('click', `#${currenttablename} td`, async function (event) {
        if (displayFilterFlag == 1) {
            let headerStructField = cloneDeep(templateObject.data.tableheaderrecords);
            let headerStructDataField = templateObject.tableheaderfeilds.get();
            let currentArray = templateObject.selectedTableData.get();
            let currentField = templateObject.selectedTableField.get();

            let cellValue = event.currentTarget.textContent.trim();
            let firstCellClass = '';
            let classList = event.currentTarget.classList;
            for (let i = 0; i < classList.length; i++) {
                if (classList[i].includes('col')) {
                    firstCellClass = classList[i].replace(/\s+/g, '');
                    break;
                }
            }

            let clickedCellIndex = headerStructField.findIndex(item => item.class == firstCellClass);
            let clickedCellValue = headerStructDataField[clickedCellIndex];

            if (currentArray.length < 5 || currentField.length < 5) {
                currentArray.push(cellValue);
                currentField.push(clickedCellValue);
            }
            templateObject.selectedTableData.set(currentArray);
            templateObject.selectedTableField.set(currentField);
            $(`#filterModal_${currenttablename}`).modal('show');
        } else if (displayFilterFlag == 2) {
            displayEditFilterFlag = 1;
            let currentArray = [];
            let currentField = [];
            let data = {};
            let targetObj = {};
            try {
                const dataObject = await getVS1Data("FiterSaveFunctionData");
                if (dataObject && dataObject.length !== 0) {
                    data = JSON.parse(dataObject[0].data);
                    const dataArr = data.tcustomfiltervs1;
                    targetObj = dataArr.find(item => item.fields.ReportName == indexDBName);
                    if (targetObj) {
                        let saveBtnFlag = '';
                        let saveBtnFlagDataObj = await getVS1Data('SaveBtnFlag');
                        if (saveBtnFlagDataObj.length > 0) saveBtnFlag = saveBtnFlagDataObj[0].data;
                        if (saveBtnFlag == 0) {
                            currentArray = stringToArray(targetObj.fields.RowSaveOne);
                            currentField = stringToArray(targetObj.fields.RowSaveFieldOne);
                        } else if (saveBtnFlag == 1) {
                            currentArray = stringToArray(targetObj.fields.RowSaveTwo);
                            currentField = stringToArray(targetObj.fields.RowSaveFieldTwo);
                        }
                    }
                }
            } catch (error) {
                swal({
                    title: 'Oooops...',
                    text: error,
                    type: 'error',
                    showCancelButton: false,
                    confirmButtonText: 'Try Again'
                }).then((result) => {
                    if (result.value) {} else if (result.dismiss === 'cancel') {}
                });
            }
            let headerStructField = cloneDeep(templateObject.data.tableheaderrecords);
            let headerStructDataField = templateObject.tableheaderfeilds.get();
            let cellValue = event.target.textContent;
            let firstCellClass = '';
            let classList = event.target.classList;
            for (let i = 0; i < classList.length; i++) {
                if (classList[i].includes('col')) {
                    firstCellClass = classList[i].replace(/\s+/g, '');
                    break;
                }
            }

            let clickedCellIndex = headerStructField.findIndex(item => item.class == firstCellClass);
            let clickedCellValue = headerStructDataField[clickedCellIndex];

            if (currentArray.length < 5 || currentField.length < 5) {
                currentArray.push(cellValue);
                currentField.push(clickedCellValue);
                let saveBtnFlag = '';
                let saveBtnFlagDataObj = await getVS1Data('SaveBtnFlag');
                if (saveBtnFlagDataObj.length > 0) saveBtnFlag = saveBtnFlagDataObj[0].data;
                if (saveBtnFlag == 0) {
                    targetObj.fields.RowSaveOne = arrayToString(currentArray);
                    targetObj.fields.RowSaveFieldOne = arrayToString(currentField);
                } else if (saveBtnFlag == 1) {
                    targetObj.fields.RowSaveTwo = arrayToString(currentArray);
                    targetObj.fields.RowSaveFieldTwo = arrayToString(currentField);
                }
                templateObject.editTableData.set(currentArray);
                templateObject.editTableField.set(currentField);
            }
            addVS1Data("FiterSaveFunctionData", JSON.stringify(data));
            $(`#customFilterModal_${currenttablename}`).modal('show');
        }
    });
});

Template.datatablelist.events({
    'click .btnAddNew': function(event) {
        let templateObject = Template.instance();
        templateObject.showAddPop.set(true);
        let label = templateObject.data.label;
        setTimeout(() => {
            $("#"+templateObject.data.addpopmodalid).modal("show")
        }, 200);
    },

    'click .btnDropdownFilter': function (event) {
        displayFilterFlag = 1;
        let currenttablename = $(event.target).attr('tablename');
        $(`#${currenttablename}`).addClass("FilterMode");
        $(`#${currenttablename} tbody`).addClass("FilterMode");
        setTimeout(function() {
            $('.customFilterModal input.headerline')[0].focus();
            $('.modal-backdrop').css('display','none');
        }, 1000);
    },
    'click .btnFilterOption, click .btnEditFilter': async function (event) {
        const templateObject = Template.instance();
        let targetReportName = templateObject.data.indexeddbname;
        let filter_id = $(event.currentTarget).attr('filter-id');
        let isEdit = $(event.currentTarget).hasClass('btnEditFilter');
        let filterIdxLabel = "";
        let inputValArrayLabel = "InputValueArray";
        if (parseInt(filter_id) == 1) {
            await addVS1Data('SaveBtnFlag', 0);
            filterIdxLabel = "One";
            inputValArrayLabel = "InputValueArray";
        } else {
            await addVS1Data('SaveBtnFlag', 1);
            filterIdxLabel = "Two";
            inputValArrayLabel = "InputVAlueArray";
        }
        displayFilterFlag = 2;
        displayEditFilterFlag = 0;
        let rowSave = [];
        let rowSaveField = [];
        let operatorArray = [];
        let operatorValueArray = [];
        let inputValuesArray = [];
        try {
            const dataObject = await getVS1Data("FiterSaveFunctionData");
            if (dataObject && dataObject.length !== 0) {
                let data = JSON.parse(dataObject[0].data);
                const dataArr = data.tcustomfiltervs1;
                const targetObj = dataArr.find(item => item.fields.ReportName === targetReportName);
                templateObject.allSavedData.set(targetObj);
                if(targetObj) {
                    rowSave = stringToArray(targetObj.fields[`RowSave${filterIdxLabel}`]);
                    rowSaveField = stringToArray(targetObj.fields[`RowSaveField${filterIdxLabel}`]);
                    operatorArray = stringToArray(targetObj.fields[`OperatorArray${filterIdxLabel}`]);
                    operatorValueArray = stringToArray(targetObj.fields[`OperatorValueArray${filterIdxLabel}`]);
                    inputValuesArray = stringToArray(targetObj.fields[`${inputValArrayLabel}${filterIdxLabel}`]);
                }
            }
        } catch (error) {
            swal({
                title: 'Oooops...',
                text: error,
                type: 'error',
                showCancelButton: false,
                confirmButtonText: 'Try Again'
            }).then((result) => {
                if (result.value) {} else if (result.dismiss === 'cancel') {}
            });
        }

        templateObject.rowsSaveData.set(rowSave);
        templateObject.rowsSaveFieldData.set(rowSaveField);
        templateObject.operatorSaveData.set(operatorArray);
        templateObject.operatorValueSaveData.set(operatorValueArray);
        templateObject.inputValueSaveData.set(inputValuesArray);
        if (isEdit) {
            let tablename = $(event.currentTarget).attr('tablename');
            $(`#${tablename}`).addClass("FilterMode");
            $(`#${tablename} tbody`).addClass("FilterMode");
            setTimeout(function() {
                $(`#customFilterModal_${tablename} input.savedHeaderline`)[0].focus();
                $('.modal-backdrop').css('display','none');
            }, 500);
        } else {
            setTimeout(() => {
                $("button.savedBtnFilterApply").click();
            }, 500);
        }
    },
    'click .btnRemoveFilter': function (event) {
        const templateObject = Template.instance();
        let targetReportName = templateObject.data.indexeddbname;
        swal({
            title: "Do you really want to remove this filter?",
            type: 'warning',
            showCancelButton: true,
            cancelButtonText: 'No',
            confirmButtonText: 'Yes'
        }).then(async (result) => {
            if (result.value) {
                let filter_id = $(event.currentTarget).attr('filter-id');
                let filterIdxLabel = "One";
                let inputValArrayLabel = "InputValueArray";
                let data = {};
                let dataArr = {};
                if (parseInt(filter_id) == 1) {
                    filterIdxLabel = "One";
                    inputValArrayLabel = "InputValueArray";
                } else {
                    filterIdxLabel = "Two";
                    inputValArrayLabel = "InputVAlueArray";
                }
                try {
                    const dataObject = await getVS1Data("FiterSaveFunctionData");
                    if (dataObject && dataObject.length !== 0) {
                        data = JSON.parse(dataObject[0].data);
                        dataArr = data.tcustomfiltervs1;
                        let targetObj = dataArr.find(item => item.fields.ReportName == targetReportName);
                        if (targetObj) {
                            targetObj.fields[`RowSave${filterIdxLabel}`] = "";
                            targetObj.fields[`RowSaveField${filterIdxLabel}`] = "";
                            targetObj.fields[`OperatorArray${filterIdxLabel}`] = "";
                            targetObj.fields[`OperatorValueArray${filterIdxLabel}`] = "";
                            targetObj.fields[`${inputValArrayLabel}${filterIdxLabel}`] = "";
                            targetObj.fields[`FilterName${filterIdxLabel}`] = "";
                            $(`#savedFilterItem${filter_id}`).addClass('d-none');
                            $(`#savedFilterItem${filter_id}`).removeClass('d-flex');
                        }
                    }
                } catch (error) {
                    swal({
                        title: 'Oooops...',
                        text: error,
                        type: 'error',
                        showCancelButton: false,
                        confirmButtonText: 'Try Again'
                    }).then((result) => {
                        if (result.value) {} else if (result.dismiss === 'cancel') {}
                    });
                }
                await addVS1Data("FiterSaveFunctionData", JSON.stringify(data));
                await utilityService.globalSaveData('FiterSaveFunctionDataTemp', dataArr, 'TCustomFilterVS1', 'SaveButton');
                $(".btnRefresh").addClass("btnRefreshAlert");
            } else if (result.dismiss === 'cancel') {}
        });
    },
    "click .btnSaveApply": async function (e) {
        //$(".fullScreenSpin").css("display", "inline-block");
        e.stopImmediatePropagation();
        const templateObject = Template.instance();

        //$('.fullScreenSpin').css('display', 'inline-block');
        let currenttablename = $(event.target).closest(".customFilterModal").attr('displaytablename');

        let _withiTerms = false;
        let _1To30Days = false;
        let _31To60Days = false;
        let _MoreThan61Days = false;

        if($('#rdoGreen').is(':checked') ){
          _withiTerms = true;
        };
        if($('#rdoYellow').is(':checked') ){
          _1To30Days = true;
        };
        if($('#rdoOrange').is(':checked') ){
          _31To60Days = true;
        };
        if($('#rdoRed').is(':checked') ){
          _MoreThan61Days = true;
        };

                // if ($(event.target).is(':checked')) {
        //
        // }
        // $('.' + currenttablename+" #dateFrom").attr('readonly', true);
        // $('.' + currenttablename+" #dateTo").attr('readonly', true);

        let params = ['', '', true]
        //templateObject.getFilteredData(params);

        /*
        if (templateObject.data.apiParams == undefined) {
            $(".fullScreenSpin").css("display", "none");
            return
        }
        await clearData(templateObject.data.indexeddbname);
        let tableData = await templateObject.getTableData(true);
        templateObject.displayTableData(tableData);
        */
    },
    "click .btnViewDeleted": async function (e) {
        $(".fullScreenSpin").css("display", "inline-block");
        // e.stopImmediatePropagation();
        const templateObject = Template.instance();
        // $('.btnViewDeleted').css('display', 'none');
        // $('.btnHideDeleted').css('display', 'inline-block');
        if (templateObject.data.apiParams == undefined) {
            $(".fullScreenSpin").css("display", "none");
            return
        }
        await clearData(templateObject.data.indexeddbname);
        let tableData = await templateObject.getTableData(true);
        templateObject.displayTableData(tableData)
    },
    "click .btnHideDeleted": async function (e) {
        $(".fullScreenSpin").css("display", "inline-block");
        // e.stopImmediatePropagation();
        let templateObject = Template.instance();
        if (templateObject.data.apiParams == undefined) {
            $(".fullScreenSpin").css("display", "none");
            return
        }
        await clearData(templateObject.data.indexeddbname);
        let tableData = await templateObject.getTableData(false);
        templateObject.displayTableData(tableData)
    },
    'change .chkDatatable': async function (event) {
        event.preventDefault();
        // event.stopImmediatePropagation();
        event.stopImmediatePropagation();
        let templateObject = Template.instance();
        let currenttablename = $(event.target).closest(".divDisplaySettings").attr('displaytablename');
        let table = $('#'+currenttablename).DataTable();
        let columnDataValue = $(event.target).closest("div").find(".divcolumn").attr('valueupdate');
        // Get the column API object
        let dataColumnIndex = $(event.target).attr('data-column');
        var column = table.column(dataColumnIndex);

        // Toggle the visibility
        // column.visible(!column.visible());
        if ($(event.target).is(':checked')) {
            column.visible(true);
            //$('#'+currenttablename+' .' + columnDataValue).addClass('showColumn');
            $('.' + columnDataValue).removeClass('hiddenColumn');
        } else {
            column.visible(false);
            $('#'+currenttablename+' .'+ columnDataValue).addClass('hiddenColumn');
            //$('#'+currenttablename+' .'+ columnDataValue).removeClass('showColumn');
        };

        // const tableHandler = new TableHandler();
        // let range = $(event.target).closest("div").next().find(".custom-range").val();
        // await $('.' + columnDataValue).css('width', range);
        // $('.dataTable').resizable();

        // setTimeout(() => {
        //     window.dispatchEvent(new Event('resize'));
        // }, 500);
    },
    'click .colChkBoxAll': function(event) {
      const templateObject = Template.instance();
      let currenttablename = $(event.target).closest('table').attr('id') || templateObject.data.tablename;
      if(templateObject.data.custid) {
        currenttablename = currenttablename + "_" + templateObject.data.custid
      }
      if ($(event.target).is(':checked')) {
          $(".chkBox").prop("checked", true);
          $(`.${currenttablename} tbody .colCheckBox`).closest('tr').addClass('checkRowSelected');
      } else {
          $(".chkBox").prop("checked", false);
          $(`.${currenttablename} tbody .colCheckBox`).closest('tr').removeClass('checkRowSelected');
      }
    },
    'change .chkBox': async function(event) {
        event.preventDefault();
        event.stopPropagation();
        const templateObject = Template.instance();
        let currenttablename = $(event.currentTarget).closest('table').attr('id') || templateObject.data.tablename;
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }

        if ($(event.currentTarget).closest('tr').hasClass('selected')) {
            //$(event.target).closest('tr').removeClass('selected');
        } else {
            $('#'+currenttablename+' > tbody tr').removeClass('selected');
            $(event.currentTarget).closest('tr').addClass('selected');
        };

        var row = $('#'+currenttablename).find('.selected'); //$(this).parents('tr');
        var rowSelected = $('#'+currenttablename).find('.checkRowSelected'); //$(this).parents('tr');
        if (row.length === 0 && rowSelected == 0) {
            return;
        };

        if ($(event.currentTarget).is(':checked')) {
            await $(event.currentTarget).closest('tr').addClass('checkRowSelected');

            //row.insertBefore($('#'+currenttablename+" > tbody tr:first"));
            // $('html, body').animate({ // Rasheed Remove scroll
            //   scrollTop: $('#'+currenttablename+"_wrapper").offset().top
            // }, 'slow');
        } else {

          //await row.insertAfter($('#'+currenttablename+" > tbody tr:last"));
          //$(event.target).closest('tr').removeClass('checkRowSelected');
          var checkboxes = $(event.currentTarget).closest('tr').find('.chkBox');
          if (!checkboxes.is(':checked')) {
              $(event.currentTarget).closest('tr').removeClass('checkRowSelected');
          }
        }
    },
    "click .exportbtn": async function () {
        $(".fullScreenSpin").css("display", "inline-block");
        let currenttablename = templateObject.data.tablename || '';
        jQuery('#' + currenttablename + '_wrapper .dt-buttons .btntabletocsv').click();
        $(".fullScreenSpin").css("display", "none");
    },
    // "click .printConfirm": async function (event) {
    //     event.preventDefault();
    //     event.stopPropagation();
    //     $(".fullScreenSpin").css("display", "inline-block");
    //     let currenttablename = templateObject.data.tablename || '';
    //     let colDef = templateObject.columnDef.get();
    //     let dataArray = templateObject.transactiondatatablerecords.get();

    //     let printTable = "<table id='print-table_"+currenttablename+"_print" + "'class='table-print-area print-table"+currenttablename+"_print" +"d-none'><thead></thead><tbody><tbody></table>"
    //     $('body').append(printTable);
    //     $('#print-table_' + currenttablename+'_print').Datatable({
    //         bom: 'B',
    //         buttons: ['pdf'],
    //         columnDefs: colDef,
    //         data: dataArray
    //     });







    //     // jQuery('#' + currenttablename + '_wrapper .dt-buttons .btntabletopdf').click();
    //     // $(".fullScreenSpin").css("display", "none");
    // },

    'click #ignoreDate': async function () {
        let templateObject = Template.instance();
        $('.fullScreenSpin').css('display', 'inline-block');
        let currenttablename = templateObject.data.tablename || '';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }
        $('.' + currenttablename+" #dateFrom").attr('readonly', true);
        $('.' + currenttablename+" #dateTo").attr('readonly', true);

        //let params = ['', '', true]
        let contactID = templateObject.data.contactid || ''; //Nowak
         let params = ['', '', true, contactID]
        templateObject.getFilteredData(params);
    },
    'click .thisweek': function () {
        let templateObject = Template.instance();
        let currenttablename = templateObject.data.tablename || '';
        let contactID = templateObject.data.contactid ||'';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }
        $('.' + currenttablename+" #dateFrom").attr('readonly', false);
        $('.' + currenttablename+" #dateTo").attr('readonly', false);
        var currentBeginDate = new Date();
        let utc = Date.UTC(currentBeginDate.getFullYear(), currentBeginDate.getMonth(), currentBeginDate.getDate());
        let thisWeekFirstDay = new Date(utc - currentBeginDate.getDay() * 1000 * 3600 * 24);

        var begunDate = moment(currentBeginDate).format("DD/MM/YYYY");
        let fromDateMonth = (currentBeginDate.getMonth() + 1);
        let fromDateDay = currentBeginDate.getDate();

        if ((currentBeginDate.getMonth() + 1) < 10) {
            fromDateMonth = "0" + (currentBeginDate.getMonth() + 1);
        } else {
            fromDateMonth = (currentBeginDate.getMonth() + 1);
        }
        if (currentBeginDate.getDate() < 10) {
            fromDateDay = "0" + currentBeginDate.getDate();
        }

        let thisWeekFromDate = thisWeekFirstDay.getDate();
        let thisWeekFromMonth;

        if ((thisWeekFirstDay.getMonth() + 1) < 10) {
            thisWeekFromMonth = "0" + (thisWeekFirstDay.getMonth() + 1);
        } else {
            thisWeekFromMonth = (thisWeekFirstDay.getMonth() + 1);
        }
        if (thisWeekFirstDay.getDate() < 10) {
            thisWeekFromDate = "0" + thisWeekFirstDay.getDate();
        }

        var toDateERPFrom = thisWeekFirstDay.getFullYear() + "-" + thisWeekFromMonth + "-" + thisWeekFromDate;
        var toDateERPTo = currentBeginDate.getFullYear() + "-" + (fromDateMonth) + "-" + (fromDateDay);

        var toDateDisplayFrom = thisWeekFromDate + "/" + thisWeekFromMonth + "/" + thisWeekFirstDay.getFullYear();
        var toDateDisplayTo = (fromDateDay) + "/" + (fromDateMonth) + "/" + currentBeginDate.getFullYear();

        $('.' + currenttablename+" #dateFrom").val(toDateDisplayFrom);
        $('.' + currenttablename+" #dateTo").val(toDateDisplayTo);

        //let params = [toDateERPFrom, toDateERPTo, false];
        let params = [toDateERPFrom, toDateERPTo, false, contactID]; //Nowak

        templateObject.getFilteredData(params)

        // if (currenttablename == "tblBankingOverview") {
        //     templateObject.getAllFilterbankingData(toDateDisplayFrom,toDateDisplayTo, false);
        // }
    },
    'click .thisMonth': function () {
        let templateObject = Template.instance();
        let currenttablename = templateObject.data.tablename || '';
        let contactID = templateObject.data.contactid ||'';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }
        $('.' + currenttablename+" #dateFrom").attr('readonly', false);
        $('.' + currenttablename+" #dateTo").attr('readonly', false);
        var currentDate = new Date();
        var prevMonthLastDate = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0);
        var prevMonthFirstDate = new Date(currentDate.getFullYear() - (currentDate.getMonth() > 0 ? 0 : 1), ((currentDate.getMonth() - 1 + 12) % 12)+1, 1);
        var formatDateComponent = function (dateComponent) {
            return (dateComponent < 10 ? '0' : '') + dateComponent;
        };

        var formatDate = function (date) {
            return formatDateComponent(date.getDate()) + '/' + formatDateComponent(date.getMonth() + 1) + '/' + date.getFullYear();
        };

        var formatDateERP = function (date) {
            return date.getFullYear() + '-' + formatDateComponent(date.getMonth() + 1) + '-' + formatDateComponent(date.getDate());
        };


        var fromDate = formatDate(prevMonthFirstDate);
        var toDate = formatDate(prevMonthLastDate);

        let getDateFrom = formatDateERP(prevMonthFirstDate);
        let getToDate = formatDateERP(prevMonthLastDate);

        $('.' + currenttablename+" #dateFrom").val(fromDate);
        $('.' + currenttablename+" #dateTo").val(toDate);

        //let params = [getDateFrom, getToDate, false]
        let params = [getDateFrom, getToDate, false, contactID]
        templateObject.getFilteredData(params)
    },
    'click .thisQuarter': function () {
        let templateObject = Template.instance();
        let currenttablename = templateObject.data.tablename || '';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }
        $('.' + currenttablename+" #dateFrom").attr('readonly', false);
        $('.' + currenttablename+" #dateTo").attr('readonly', false);


        var thisQuarterStartDateFormat =  moment().startOf("Q").format("DD/MM/YYYY");
        var thisQuarterEndDateFormat = moment().endOf("Q").format("DD/MM/YYYY");

        let fromDate = moment().startOf("Q").format("YYYY-MM-DD");
        let toDate = moment().endOf("Q").format("YYYY-MM-DD");


        $('.' + currenttablename+" #dateFrom").val(thisQuarterStartDateFormat);
        $('.' + currenttablename+" #dateTo").val(thisQuarterEndDateFormat);

        let contactID = templateObject.data.contactid ||'';

        let params = [fromDate, toDate, false, contactID];
        templateObject.getFilteredData(params);
    },
    'click .thisfinancialyear': function () {
        let templateObject = Template.instance();
        let currenttablename = templateObject.data.tablename || '';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }

        $('.' + currenttablename+" dateFrom").attr('readonly', false);
        $('.' + currenttablename+" dateTo").attr('readonly', false);

          let current_fiscal_year_start  = null;
          let current_fiscal_year_end  = null;

          let currentERP_fiscal_year_start  = null;
          let currentERP_fiscal_year_end  = null;

          const startMonthName = "July";
          const endMonthName = "June";
          if (moment().quarter() == 4) {
            currentERP_fiscal_year_start = moment().month(startMonthName).startOf("month").format("YYYY-MM-DD");
            currentERP_fiscal_year_end = moment().add(1, "year").month(endMonthName).endOf("month").format("YYYY-MM-DD");

            current_fiscal_year_start = moment().month(startMonthName).startOf("month").format("DD/MM/YYYY");
            current_fiscal_year_end = moment().add(1, "year").month(endMonthName).endOf("month").format("DD/MM/YYYY");
          } else {
            currentERP_fiscal_year_start = moment().subtract(1, "year").month(startMonthName).startOf("month").format("YYYY-MM-DD");
            currentERP_fiscal_year_end = moment().month(endMonthName).endOf("month").format("YYYY-MM-DD");

            current_fiscal_year_start = moment().subtract(1, "year").month(startMonthName).startOf("month").format("DD/MM/YYYY");
            current_fiscal_year_end = moment().month(endMonthName).endOf("month").format("DD/MM/YYYY");
          };

        $('.' + currenttablename+" #dateFrom").val(current_fiscal_year_start);
        $('.' + currenttablename+" #dateTo").val(current_fiscal_year_end);

        let contactID = templateObject.data.contactid ||'';
        let params = [currentERP_fiscal_year_start, currentERP_fiscal_year_end, false,contactID];
        templateObject.getFilteredData(params);
        // if (currenttablename == "tblBankingOverview") {
        //     templateObject.getAllFilterbankingData(fromDate,begunDate, false);
        // }
    },
    'click .previousweek': function () {
        let templateObject = Template.instance();
        let currenttablename = templateObject.data.tablename || '';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }
        $('.' + currenttablename+" #dateFrom").attr('readonly', false);
        $('.' + currenttablename+" #dateTo").attr('readonly', false);
        var currentBeginDate = new Date();
        let utc = Date.UTC(currentBeginDate.getFullYear(), currentBeginDate.getMonth(), currentBeginDate.getDate());
        let previousWeekFirstDay = new Date(utc - (currentBeginDate.getDay() + 7) * 1000 * 3600 * 24);
        let previousWeekLastDay = new Date(utc - (currentBeginDate.getDay() + 1) * 1000 * 3600 * 24);

        var begunDate = moment(previousWeekFirstDay).format("DD/MM/YYYY");
        let previousWeekFromMonth = (previousWeekFirstDay.getMonth() + 1);
        let previousWeekFromDay = previousWeekFirstDay.getDate();

        if ((previousWeekFirstDay.getMonth() + 1) < 10) {
            previousWeekFromMonth = "0" + (previousWeekFirstDay.getMonth() + 1);
        } else {
            previousWeekFromMonth = (previousWeekFirstDay.getMonth() + 1);
        }
        if (previousWeekFirstDay.getDate() < 10) {
            previousWeekFromDay = "0" + previousWeekFirstDay.getDate();
        }

        let previousWeekToDate = previousWeekLastDay.getDate();
        let previousWeekToMonth;

        if ((previousWeekLastDay.getMonth() + 1) < 10) {
            previousWeekToMonth = "0" + (previousWeekLastDay.getMonth() + 1);
        } else {
            previousWeekToMonth = (previousWeekLastDay.getMonth() + 1);
        }
        if (previousWeekToDate < 10) {
            previousWeekToDate = "0" + previousWeekLastDay.getDate();
        }

        var toDateERPFrom = previousWeekFirstDay.getFullYear() + "-" + previousWeekFromMonth + "-" + previousWeekFromDay;
        var toDateERPTo = previousWeekLastDay.getFullYear() + "-" + (previousWeekToMonth) + "-" + (previousWeekToDate);

        var toDateDisplayFrom = previousWeekFromDay + "/" + previousWeekFromMonth + "/" + previousWeekFirstDay.getFullYear();
        var toDateDisplayTo = (previousWeekToDate) + "/" + (previousWeekToMonth) + "/" + previousWeekLastDay.getFullYear();

        $('.' + currenttablename+" #dateFrom").val(toDateDisplayFrom);
        $('.' + currenttablename+" #dateTo").val(toDateDisplayTo);
        let contactID = templateObject.data.contactid ||'';
        let params = [toDateERPFrom, toDateERPTo, false, contactID]
        templateObject.getFilteredData(params)

        // if (currenttablename == "tblBankingOverview") {
        //     templateObject.getAllFilterbankingData(toDateDisplayFrom,toDateDisplayTo, false);
        // }
    },
    'click .previousmonth': function () {
        let templateObject = Template.instance();
        let currenttablename = templateObject.data.tablename || '';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }
        $('.' + currenttablename+" #dateFrom").attr('readonly', false);
        $('.' + currenttablename+" #dateTo").attr('readonly', false);
        var currentDate = new Date();

        var prevMonthLastDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
        var prevMonthFirstDate = new Date(currentDate.getFullYear() - (currentDate.getMonth() > 0 ? 0 : 1), (currentDate.getMonth() - 1 + 12) % 12, 1);

        var formatDateComponent = function (dateComponent) {
            return (dateComponent < 10 ? '0' : '') + dateComponent;
        };

        var formatDate = function (date) {
            return formatDateComponent(date.getDate()) + '/' + formatDateComponent(date.getMonth() + 1) + '/' + date.getFullYear();
        };

        var formatDateERP = function (date) {
            return date.getFullYear() + '-' + formatDateComponent(date.getMonth() + 1) + '-' + formatDateComponent(date.getDate());
        };


        var fromDate = formatDate(prevMonthFirstDate);
        var toDate = formatDate(prevMonthLastDate);

        let getDateFrom = formatDateERP(prevMonthFirstDate);
        let getToDate = formatDateERP(prevMonthLastDate);

        $('.' + currenttablename+" #dateFrom").val(fromDate);
        $('.' + currenttablename+" #dateTo").val(toDate);
        let contactID = templateObject.data.contactid ||'';
        let params = [getDateFrom, getToDate, false, contactID]
        templateObject.getFilteredData(params);

        // if (currenttablename == "tblBankingOverview") {
        //     templateObject.getAllFilterbankingData(fromDate,toDate, false);
        // }

    },
    'click .previousquarter': function () {
        let templateObject = Template.instance();
        let currenttablename = templateObject.data.tablename || '';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }
        $('.' + currenttablename+" #dateFrom").attr('readonly', false);
        $('.' + currenttablename+" #dateTo").attr('readonly', false);

        var lastQuarterStartDateFormat =  moment().subtract(1, "Q").startOf("Q").format("DD/MM/YYYY");
        var lastQuarterEndDateFormat = moment().subtract(1, "Q").endOf("Q").format("DD/MM/YYYY");

        let fromDate = moment().subtract(1, "Q").startOf("Q").format("YYYY-MM-DD");
        let toDate = moment().subtract(1, "Q").endOf("Q").format("YYYY-MM-DD");


        $('.' + currenttablename+" #dateFrom").val(lastQuarterStartDateFormat);
        $('.' + currenttablename+" #dateTo").val(lastQuarterEndDateFormat);
        let contactID = templateObject.data.contactid ||'';
        let params = [fromDate, toDate, false, contactID];
        templateObject.getFilteredData(params);

    },
    'click .previousfinancialyear': function () {
        let templateObject = Template.instance();
        let currenttablename = templateObject.data.tablename || '';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }

        $('.' + currenttablename+" #dateFrom").attr('readonly', false);
        $('.' + currenttablename+" #dateTo").attr('readonly', false);

        let previous_fiscal_year_start  = null;
        let previous_fiscal_year_end  = null;

        let previousERP_fiscal_year_start  = null;
        let previousERP_fiscal_year_end  = null;

        const startMonthName = "July";
        const endMonthName = "June";
        if (moment().quarter() == 4) {
          previousERP_fiscal_year_start = moment().subtract(1, 'year').month(startMonthName).startOf("month").format("YYYY-MM-DD");
          previousERP_fiscal_year_end = moment().month(endMonthName).endOf("month").format("YYYY-MM-DD");

          previous_fiscal_year_start = moment().subtract(1, 'year').month(startMonthName).startOf("month").format("DD/MM/YYYY");
          previous_fiscal_year_end = moment().month(endMonthName).endOf("month").format("DD/MM/YYYY");
        } else {
          previousERP_fiscal_year_start = moment().subtract(2, 'year').month(startMonthName).startOf("month").format("YYYY-MM-DD");
          previousERP_fiscal_year_end = moment().subtract(1, 'year').month(endMonthName).endOf("month").format("YYYY-MM-DD");

          previous_fiscal_year_start = moment().subtract(2, 'year').month(startMonthName).startOf("month").format("DD/MM/YYYY");
          previous_fiscal_year_end = moment().subtract(1, 'year').month(endMonthName).endOf("month").format("DD/MM/YYYY");
        };

      $('.' + currenttablename+" #dateFrom").val(previous_fiscal_year_start);
      $('.' + currenttablename+" #dateTo").val(previous_fiscal_year_end);

      let contactID = templateObject.data.contactid ||'';
      let params = [previousERP_fiscal_year_start, previousERP_fiscal_year_end, false,contactID];
        templateObject.getFilteredData(params);
    },

    'click #today': function () {
        let templateObject = Template.instance();
        $('.fullScreenSpin').css('display', 'inline-block');
        let currenttablename = templateObject.data.tablename || '';
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }
        $('.' + currenttablename+" #dateFrom").attr('readonly', false);
        $('.' + currenttablename+" #dateTo").attr('readonly', false);
        var currentBeginDate = new Date();
        var begunDate = moment(currentBeginDate).format("DD/MM/YYYY");
        let fromDateMonth = (currentBeginDate.getMonth() + 1);
        let fromDateDay = currentBeginDate.getDate();
        if ((currentBeginDate.getMonth() + 1) < 10) {
            fromDateMonth = "0" + (currentBeginDate.getMonth() + 1);
        } else {
            fromDateMonth = (currentBeginDate.getMonth() + 1);
        }

        if (currentBeginDate.getDate() < 10) {
            fromDateDay = "0" + currentBeginDate.getDate();
        }
        var toDateERPFrom = currentBeginDate.getFullYear() + "-" + (fromDateMonth) + "-" + (fromDateDay);
        var toDateERPTo = currentBeginDate.getFullYear() + "-" + (fromDateMonth) + "-" + (fromDateDay);

        var toDateDisplayFrom = (fromDateDay) + "/" + (fromDateMonth) + "/" + currentBeginDate.getFullYear();
        var toDateDisplayTo = (fromDateDay) + "/" + (fromDateMonth) + "/" + currentBeginDate.getFullYear();

        $('.' + currenttablename+" #dateFrom").val(toDateDisplayFrom);
        $('.' + currenttablename+" #dateTo").val(toDateDisplayTo);
        let contactID = templateObject.data.contactid ||'';
        let params = [toDateERPFrom, toDateERPTo, false,contactID];
        templateObject.getFilteredData(params)
        // templateObject.getAllFilterSalesOrderData(toDateERPFrom,toDateERPTo, false);
    },

    'change .custom-range': async function (event) {
        const tableHandler = new TableHandler();
        let range = $(event.target).val() || 100;
        let colClassName = $(event.target).attr("valueclass");
        await $('.' + colClassName).css('width', range);
        // $('.dataTable').resizable();
    },

    'keyup .dataTables_filter input': function (event) {
        if ($(event.target).val() != '') {
            $(".btnRefreshTable").addClass('btnSearchAlert');
        } else {
            $(".btnRefreshTable").removeClass('btnSearchAlert');
        }
        if (event.keyCode == 13) {
            $(event.target).closest('.dataTables_filter').next().trigger('click');
            // $(".btnRefreshTable").trigger("click");
        }
    },
    'click .btnRefreshTable': async function (event) {
        event.preventDefault()
        event.stopPropagation()
        let templateObject = Template.instance();
        let utilityService = new UtilityService();
        let indexDBLowercase = templateObject.data.lowercaseDataName || indexDBName.toLowerCase();
        const dataTableList = [];
        $('.fullScreenSpin').css('display', 'inline-block');
        let tablename = templateObject.data.tablename;
        if(templateObject.data.custid) {
            tablename = tablename + "_" + templateObject.data.custid
        }
        let dataSearchName = $('#' + tablename + '_filter input').val();
        if(templateObject.data.productID){
            if (dataSearchName.replace(/\s/g, '') != '') {
                let that = templateObject.data.service;
                if (that == undefined) {
                    $('.fullScreenSpin').css('display', 'none');
                    $('.btnRefreshTable').removeClass('btnSearchAlert');
                    return;
                }
                let paramArray = [dataSearchName,templateObject.data.productID]
                templateObject.data.searchAPI.apply(that, paramArray).then(function (data) {
                    $('.btnRefreshTable').removeClass('btnSearchAlert');
                    templateObject.displayTableData(data, true)
                }).catch(function (err) {
                    $('.fullScreenSpin').css('display', 'none');
                });
            } else {
                //$(".btnRefresh").trigger("click");
                if (templateObject.data.apiParams == undefined) {
                    $(".fullScreenSpin").css("display", "none");
                    return
                }
                await clearData(templateObject.data.indexeddbname);
                let tableData = await templateObject.getTableData(false);
                templateObject.displayTableData(tableData);
            }
        }
        else if(templateObject.data.contactid){
                if (dataSearchName.replace(/\s/g, '') != '') {
                    let that = templateObject.data.service;
                    if (that == undefined) {
                        $('.fullScreenSpin').css('display', 'none');
                        $('.btnRefreshTable').removeClass('btnSearchAlert');
                        return;
                    }
                    let paramArray = [dataSearchName,templateObject.data.contactid]
                    templateObject.data.searchAPI.apply(that, paramArray).then(function (data) {
                        $('.btnRefreshTable').removeClass('btnSearchAlert');
                        templateObject.displayTableData(data, true)
                    }).catch(function (err) {
                        $('.fullScreenSpin').css('display', 'none');
                    });
                } else {
                  //$(".btnRefresh").trigger("click");
                  if (templateObject.data.apiParams == undefined) {
                      $(".fullScreenSpin").css("display", "none");
                      return
                  }
                  await clearData(templateObject.data.indexeddbname);
                  let tableData = await templateObject.getTableData(false);
                  templateObject.displayTableData(tableData);
                }
        } else if(templateObject.data.typefilter){
            if (dataSearchName.replace(/\s/g, '') != '') {
                let that = templateObject.data.service;
                if (that == undefined) {
                    $('.fullScreenSpin').css('display', 'none');
                    $('.btnRefreshTable').removeClass('btnSearchAlert');
                    return;
                }
                let paramArray = [dataSearchName,templateObject.data.typefilter]
                templateObject.data.searchAPI.apply(that, paramArray).then(function (data) {
                    $('.btnRefreshTable').removeClass('btnSearchAlert');
                    templateObject.displayTableData(data, true)
                }).catch(function (err) {
                    $('.fullScreenSpin').css('display', 'none');
                });
            } else {
                //$(".btnRefresh").trigger("click");
                if (templateObject.data.apiParams == undefined) {
                    $(".fullScreenSpin").css("display", "none");
                    return
                }
                await clearData(templateObject.data.indexeddbname);
                let tableData = await templateObject.getTableData(false);
                templateObject.displayTableData(tableData);
            }
    }
        else{
        if (dataSearchName.replace(/\s/g, '') != '') {
            let that = templateObject.data.service;
            if (that == undefined) {
                $('.fullScreenSpin').css('display', 'none');
                $('.btnRefreshTable').removeClass('btnSearchAlert');
                return;
            }
            //let paramArray = [dataSearchName];
            let paramArray = [dataSearchName.charAt(0).toUpperCase() + dataSearchName.slice(1)];
            templateObject.data.searchAPI.apply(that, paramArray).then(function (data) {
                $('.btnRefreshTable').removeClass('btnSearchAlert');
                if(data[indexDBLowercase].length > 0) {
                  templateObject.displayTableData(data, true)
                }else{
                  $('.fullScreenSpin').css('display', 'none');
                  swal({
                      title: "Question",
                      html: true,
                      html: '"' + paramArray + '"' + " Does Not Exist, Would You Like To Create It?",
                      //html: '"' + paramArray + '"' + " Does Not Exist, Would You Like To Create It? <br><br> <strong style='font-size: 16px!important; font-weight: bold!important;'>(Refresh the List First to Ensure the List is up to Date)</strong>",
                      // text: '"' + paramArray + '"' + " Does Not Exist, Would You Like To Create It? <br> (Refresh the List First to Ensure the List is up to Date)",
                      type: "question",
                      showCancelButton: true,
                      confirmButtonText: "Yes",
                      cancelButtonText: "No",
                  }).then((result) => {
                      if (result.value) {
                        if(templateObject.data.addpopmodalid){
                        templateObject.showAddPop.set(true);
                        setTimeout(() => {
                            $("#"+templateObject.data.addpopmodalid).modal("show");
                        }, 200);
                      }else if(templateObject.data.searchredirect){
                        FlowRouter.go('/'+templateObject.data.searchredirect+'?searchparams='+paramArray);
                      }
                      } else if (result.dismiss === "cancel") {
                      }
                  });
                }

            }).catch(function (err) {
                $('.fullScreenSpin').css('display', 'none');
            });
        } else {
            //$(".btnRefresh").trigger("click");
            if (templateObject.data.apiParams == undefined) {
                $(".fullScreenSpin").css("display", "none");
                return
            }
            await clearData(templateObject.data.indexeddbname);
            let tableData = await templateObject.getTableData(false);
            templateObject.displayTableData(tableData);
        }
    }
    },

    "blur .divcolumn": function (event) {
        let columData = $(event.target).html();
        let columHeaderUpdate = $(event.target).attr("valueupdate");
        $("th." + columHeaderUpdate + "").html(columData);
    },
    // custom field displaysettings
    'click .resetTable': function (event) {
        let templateObject = Template.instance();
        let currenttranstablename = templateObject.data.tablename||"";
        if(templateObject.data.custid) {
            currenttablename = currenttablename + "_" + templateObject.data.custid
        }
        let loggedEmpID = localStorage.getItem('mySessionEmployeeLoggedID')||0;
        //let reset_data = await templateObject.reset_data.get();
        //reset_data = reset_data.filter(redata => redata.display);
        $('.fullScreenSpin').css('display', 'inline-block');
        //Rasheed Add Reset Function (API)
        var erpGet = erpDb();
        let objResetData = {
            Name:"VS1_Customize",
            Params:
                {
                    EmployeeID:parseInt(loggedEmpID)||0,
                    TableName:currenttranstablename,
                    Columns:[
                        {
                            "Width":"0"
                        }
                    ],
                    Reset:true
                }
        }

        var oPost = new XMLHttpRequest();
        oPost.open("POST", URLRequest + erpGet.ERPIPAddress + ':' + erpGet.ERPPort + '/' + 'erpapi/VS1_Cloud_Task/Method?Name="VS1_Customize"', true);
        oPost.setRequestHeader("database", erpGet.ERPDatabase);
        oPost.setRequestHeader("username", erpGet.ERPUsername);
        oPost.setRequestHeader("password", erpGet.ERPPassword);
        oPost.setRequestHeader("Accept", "application/json");
        oPost.setRequestHeader("Accept", "application/html");
        oPost.setRequestHeader("Content-type", "application/json");
        var myString = JSON.stringify(objResetData);

        oPost.send(myString);

        oPost.onreadystatechange = function() {
            if(oPost.readyState == 4 && oPost.status == 200) {

                var myArrResponse = JSON.parse(oPost.responseText);
                if(myArrResponse.ProcessLog.Error){
                    $('.fullScreenSpin').css('display','none');
                    swal('Oooops...', myArrResponse.ProcessLog.Error, 'error');
                }else{
                    sideBarService.getNewCustomFieldsWithQuery(parseInt(localStorage.getItem('mySessionEmployeeLoggedID')), '').then(async function(dataCustomize) {
                        await addVS1Data('VS1_Customize', JSON.stringify(dataCustomize));
                        templateObject.init_reset_data();
                        templateObject.initCustomFieldDisplaySettings("", currenttranstablename);
                        $('#'+currenttranstablename+'_Modal').modal('hide');
                        $('.modal-backdrop').css('display','none');
                        $('.fullScreenSpin').css('display','none');
                        swal({
                            title: 'SUCCESS',
                            text: "Display settings is updated!",
                            type: 'success',
                            showCancelButton: false,
                            confirmButtonText: 'OK'
                        }).then((result) => {
                          location.reload();
                        });
                    }).catch(function (err) {
                        $('.fullScreenSpin').css('display','none');
                    });


                }

            }else if(oPost.readyState == 4 && oPost.status == 403){
                $('.fullScreenSpin').css('display','none');
                swal({
                    title: 'Oooops...',
                    text: oPost.getResponseHeader('errormessage'),
                    type: 'error',
                    showCancelButton: false,
                    confirmButtonText: 'Try Again'
                }).then((result) => {
                    if (result.value) {

                    } else if (result.dismiss === 'cancel') {

                    }
                });
            }else if(oPost.readyState == 4 && oPost.status == 406){
                $('.fullScreenSpin').css('display','none');
                var ErrorResponse = oPost.getResponseHeader('errormessage');
                var segError = ErrorResponse.split(':');

                if((segError[1]) == ' "Unable to lock object'){

                    swal('WARNING', oPost.getResponseHeader('errormessage')+'Please try again!', 'error');
                }else{

                    swal('WARNING', oPost.getResponseHeader('errormessage')+'Please try again!', 'error');
                }

            }else if(oPost.readyState == '') {
                $('.fullScreenSpin').css('display','none');
                swal('Connection Failed', oPost.getResponseHeader('errormessage') +' Please try again!', 'error');
            }
        }
    },

    // custom field displaysettings
    'click .saveTable': async function (event) {
        let lineItems = [];
        let sideBarService = new SideBarService();
        let templateObject = Template.instance();
        let tableName = templateObject.data.tablename;
        // if(templateObject.data.custid) {
        //     currenttablename = currenttablename + "_" + templateObject.data.custid
        // }
        $(".fullScreenSpin").css("display", "inline-block");

        $('#'+tableName+'_Modal .displaySettings').each(function (index) {
            var $tblrow = $(this);
            var fieldID = $tblrow.attr("custid") || 0;
            var colTitle = $tblrow.find(".divcolumn").text() || "";
            var colWidth = $tblrow.find(".custom-range").val() || 100;
            var colthClass = $tblrow.find(".divcolumn").attr("valueupdate") || "";
            var colHidden = false;
            if ($tblrow.find(".custom-control-input").is(":checked")) {
                colHidden = true;
            } else {
                colHidden = false;
            }
            let lineItemObj = {
                index: parseInt(fieldID),
                label: colTitle,
                active: colHidden,
                width: parseFloat(colWidth),
                sWidth: parseFloat(colWidth),
                sWidthOrig: parseFloat(colWidth),
                class: colthClass,
                display: true
            };

            lineItems.push(lineItemObj);
        });


        let reset_data = templateObject.reset_data.get();
        reset_data = reset_data.filter(redata => redata.display == false);
        lineItems.push(...reset_data);
        lineItems.sort((a, b) => a.index - b.index);

        try {
            let erpGet = erpDb();

            let employeeId = parseInt(localStorage.getItem('mySessionEmployeeLoggedID')) || 0;
            let added = await sideBarService.saveNewCustomFields(erpGet, tableName, employeeId, lineItems);
            if (added) {
                sideBarService.getNewCustomFieldsWithQuery(parseInt(localStorage.getItem('mySessionEmployeeLoggedID')), '').then(async function (dataCustomize) {
                    await addVS1Data('VS1_Customize', JSON.stringify(dataCustomize));
                    $(".fullScreenSpin").css("display", "none");
                    swal({
                        title: 'SUCCESS',
                        text: "Display settings is updated!",
                        type: 'success',
                        showCancelButton: false,
                        confirmButtonText: 'OK'
                    }).then((result) => {
                        if (result.value) {
                            $('#'+tableName+'_Modal').modal('hide');
                        }
                    });
                });
            } else {
                swal("Something went wrong!", "", "error");
            }
        } catch (error) {
            $(".fullScreenSpin").css("display", "none");
            swal("Something went wrong!", "", "error");
        }
    },
    'click button[data-dismiss="modal"]': function(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        let targetModal = $(event.target).closest('div.modal.fade.show');
        if(targetModal.length > 0) {
            $(targetModal).modal('hide')
        }
    },
    'click .closeDisplaySettings': function(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        let targetModal = $(event.target).closest('div.modal.fade.divDisplaySettings.show');

        var ancestorDiv = $(this).closest('modal');
        if (typeof ancestorDiv.prevObject[0].addpopmodalid === 'undefined') {//Reload Close If not Modal List On Transactions
            location.reload();
        } else {
          if(targetModal.length > 0) {
              $(targetModal).modal('hide');
          }
        }

    }

})

Template.datatablelist.helpers({
    // displayfields: () => {
    //     let fields =  Template.instance().displayfields.get();
    //     return fields;
    // },
    displayfields: () => { // order display settings alphabetically (Martin)
        let fields =  JSON.parse(JSON.stringify(Template.instance().displayfields.get()));
        fields.sort((a, b) => a?.custfieldlabel > b?.custfieldlabel ? 1 : -1)
        return fields;
    },
    istransaction: () => {
        return Template.instance().data.istransaction;
    },
    showAddPop: () => {
        return Template.instance().showAddPop.get()
    },
    service: ()=>{
        return Template.instance().data.service;
    },
    filterAPI: ()=>{
        return Template.instance().data.filterAPI;
    },
    tableheaderfeilds: ()=>{
        return Template.instance().tableheaderfeilds.get();
    },
    selectedTableData: ()=>{
        return Template.instance().selectedTableData.get();
    },
    selectedTableField: ()=>{
        return Template.instance().selectedTableField.get();
    },
    exportfilename: ()=>{
        return Template.instance().data.exportfilename;
    },
    editTableData: ()=>{
        return Template.instance().editTableData.get();
    },
    editTableField: ()=>{
        return Template.instance().editTableField.get();
    },
    indexdbSavedData: () => {
        return Template.instance().allSavedData.get()
    },transactiondatatablerecords: () => {
        return Template.instance().transactiondatatablerecords.get()
    },
    rows: () => {
        return Template.instance().rowsSaveData.get()
    },
    rowsField: () => {
        return Template.instance().rowsSaveFieldData.get()
    },
    operators: () => {
        return Template.instance().operatorSaveData.get()
    },
    operatorValues: () => {
        return Template.instance().operatorValueSaveData.get()
    },
    inputValuesData: () => {
        return Template.instance().inputValueSaveData.get()
    },
    displayTableData: function () {
        const templateObject = Template.instance();
        return function (data, isEx) {
            templateObject.displayTableData(data, isEx);
        };
    }
});
