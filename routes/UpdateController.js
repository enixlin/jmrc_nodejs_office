var express = require("express");
var router = express.Router();
var dbService_local = require("./../services/DBService");
var dbService_remote = require("./../services/DBService_remote");

/* GET home page. */
router.all("/localToRemote", async function(req, res, next) {
    let db_local = new dbService_local();
    let db_remote = new dbService_remote();
    let result = await db_remote.query("select * from user", {});
    res.send("get all users" + result);

    //取得本地和远程服务器的更新日期
    let local_date = await db_local.query("select * from updatelog", {});
    let remote_date = await db_remote.query("select * from updatelog", {});

    let local_date_tf = formatDate(local_date[0]["updatedate"]);
    let local_date_subject = formatDate(local_date[1]["updatedate"]);
    let local_date_settle = formatDate(local_date[2]["updatedate"]);

    let remote_date_tf = formatDate(remote_date[0]["updatedate"]);
    let remote_date_subject = formatDate(remote_date[1]["updatedate"]);
    let remote_date_settle = formatDate(remote_date[2]["updatedate"]);

    console.log("local_date_settle", local_date_settle);
    console.log("remote_date_settle", remote_date_settle);
    console.log("local_date_subject", local_date_subject);
    console.log("remote_date_subject", remote_date_subject);
    console.log("local_date_tf", local_date_tf);
    console.log("remote_date_tf", remote_date_tf);

    if (local_date_settle > remote_date_settle) {
        let result = '';
        result = await updateRemoteSettle(+remote_date_settle + 1, local_date_settle);

        result = await updatelog(local_date_settle, "settle")
        console.log(result);
    } else {
        console.log("无需更新远程服务器：结算量");
    }

    if (local_date_subject > remote_date_subject) {
        let result = '';
        result = await updateRemoteSubject(+remote_date_subject + 1, local_date_subject);

        result = await updatelog(local_date_subject, "subject")
        console.log(result);
    } else {
        console.log("无需更新远程服务器：科目余额");
    }

    if (local_date_tf > remote_date_tf) {
        let result = '';
        result = await updateRemoteTF(+remote_date_tf + 1, local_date_tf);

        result = await updatelog(local_date_tf, "tf")
        console.log(result);
    } else {
        console.log("无需更新远程服务器：信贷中间表 ");
    }

});


async function updatelog(date, type) {
    let db_remote = new dbService_remote();
    let sql = "update updatelog set updatedate=? where type=?";
    return await db_remote.query(sql, [date, type]);

}


async function updateRemoteSettle(start, end) {
    console.log("run updateRemoteSettle");
    console.log("正在执行结算量更新", start, end);
    let db_local = new dbService_local();
    let db_remote = new dbService_remote();
    //读取本地结算量的记录，时间段为[start,end]
    let sql = "select * from settle_record where busy_date>=? and busy_date<=? ";
    let record_local = await db_local.query(sql, [start, end]);
    let dataString = JSON.stringify(record_local);
    let data = JSON.parse(dataString);
    let insertData = [];
    data.forEach(e => {
        let row = [];
        for (var i in e) {
            row.push(e[i]);
        }
        insertData.push(row);
    });

    // 将远程数据库中时间段为[start,end]的数据删除
    sql = "delete from settle_record where busy_date>=? and busy_date<=? ";
    await db_remote.query(sql, [start, end]);

    //将读取的数据写入远程数据库
    sql = "insert into settle_record values ? ";
    let result = await db_remote.query(sql, [insertData]);
    console.log("插入国际结算量数据：" + result);

}


async function updateRemoteSubject(start, end) {
    console.log("run updateRemoteSubject");
    console.log("正在执行远程服务器科目余额表更新", start, end);
    let db_local = new dbService_local();
    let db_remote = new dbService_remote();
    //读取本地科目余额表的记录，时间段为[start,end]
    let sql = "select * from subject_balance where `平台日期`>=? and `平台日期`<=? ";
    let record_local = await db_local.query(sql, [start, end]);
    let dataString = JSON.stringify(record_local);
    let data = JSON.parse(dataString);
    let insertData = [];
    data.forEach(e => {
        let row = [];
        for (var i in e) {
            row.push(e[i]);
        }
        insertData.push(row);
    });

    // 将远程数据库中时间段为[start,end]的数据删除
    sql = "delete from subject_balance where `平台日期`>=? and `平台日期`<=? ";
    await db_remote.query(sql, [start, end]);

    //将读取的数据写入远程数据库
    sql = "insert into subject_balance values ? ";
    let result = await db_remote.query(sql, [insertData]);
    console.log("插入科目余额表量数据：" + result);

}


async function updateRemoteTF(start, end) {
    console.log("run updateRemoteTF");
    console.log("正在执行远程服务器信贷中间表更新", start, end);
    let db_local = new dbService_local();
    let db_remote = new dbService_remote();
    //读取本地信贷中间表的记录，时间段为[start,end]
    let sql = "select * from tf_middle_copy1 where data_date>=? and data_date<=? ";
    let record_local = await db_local.query(sql, [start, end]);
    let dataString = JSON.stringify(record_local);
    let data = JSON.parse(dataString);
    let insertData = [];
    data.forEach(e => {
        let row = [];
        for (var i in e) {
            row.push(e[i]);
        }
        insertData.push(row);
    });

    // 将远程数据库中时间段为[start,end]的数据删除
    sql = "delete from tf_middle_copy1 where data_date>=? and data_date<=? ";
    await db_remote.query(sql, [start, end]);

    //将读取的数据写入远程数据库
    sql = "insert into tf_middle_copy1 values ? ";
    let result = await db_remote.query(sql, [insertData]);
    console.log("插入信贷中间表表量数据：" + result);

}



function formatDate(dateObj) {
    var updatetimeval =
        "" + dateObj.getFullYear() +

        (((dateObj.getMonth() + 1) < 10) ? ("0" + (dateObj.getMonth() + 1)) : (dateObj.getMonth() + 1)) +

        (dateObj.getDate() < 10 ? ("0" + dateObj.getDate()) : dateObj.getDate());

    return updatetimeval;
}

module.exports = router;