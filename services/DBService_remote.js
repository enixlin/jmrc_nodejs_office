var mysql = require("mysql");
var mysql2 = require("mysql2");
var mutilTask = require("async");

class Mysql {
    constructor() {
        this.pool = mysql.createPool({
            host: "111.229.91.24",
            user: "linzhenhuan",
            password: "enixlin1981",
            database: "jmrc"
        });
    }

    getMyConnect() {
        let me = this;
        return new Promise(function(resolve, reject) {
            me.pool.getConnection(function(error, connection) {
                if (error) {
                    resolve(null);
                } else {
                    return resolve(connection);
                }
            });
        });
    }

    //执行单步的mysql操作
    async query(sql, params) {
        let me = this;
        let conn = await me.getMyConnect();
        return new Promise(resolve => {
            conn.query(sql, params, (err, rs) => {
                if (err) {
                    me.pool.releaseConnection(conn);
                    return resolve(err);
                } else {
                    me.pool.releaseConnection(conn);
                    return resolve(rs);
                }
            });
        });
    }

    //执行多步的mysql操作
    async querys(querys) {
        let me = this;
        let conn = await me.getMyConnect();
        return new Promise(resolve => {
            //开启数据库事务
            conn.beginTransaction(err => {
                if (err) {
                    return "fail start Transaction";
                } else {
                    querys.forEach(element => {
                        conn.query(element.sql, element.params, (e, rs) => {
                            if (e) {
                                console.log(e);
                                conn.rollback(function(error) {
                                    return resolve(error);
                                });
                            }
                        });
                    });
                    conn.commit((err, info) => {
                        console.log("transaction info: " + JSON.stringify(info));
                        if (err) {
                            conn.rollback();
                            return resolve(err);
                        } else {
                            return resolve(info);
                        }
                    });
                    conn.release();
                }
            });
        });
    }
}

module.exports = Mysql;