/**
 * @name serveMnus.js
 * @author Mr·Fan DkPlusAI
 * @Time 2025/07/22
 * @description serveMnus  查询菜单
 **/

const { querySql } = require('../../../utils/index');
const jwt = require('jsonwebtoken');
const {
  PRIVATE_KEY,
  CODE_ERROR,
  CODE_SUCCESS
} = require('../../../utils/Statuscode');

async function serveMnus(req, res) {
  try {
    const query = 'SELECT * FROM menus WHERE is_hidden = 0 ORDER BY parent_id, sort';
    const menuList = await querySql(query);

    // 组装成树
    const tree = listToTree(menuList);

    // 递归过滤，确保只有父菜单和其子菜单都是 is_hidden=0
    function filterTree(nodes) {
      return nodes
        .filter(node => node.is_hidden === 0)
        .map(node => {
          if (node.children && node.children.length > 0) {
            node.children = filterTree(node.children);
          }
          return node;
        });
    }

    const filteredTree = filterTree(tree);

    return res.json({
      code: CODE_SUCCESS,
      msg: '查询成功',
      data: filteredTree
    });
  } catch (err) {
    console.error('菜单查询失败:', err);
    return res.status(500).json({
      code: CODE_ERROR,
      msg: '菜单查询失败: ' + err.message,
      data: null
    });
  }
}

// 组装树函数
function listToTree(list) {
  const map = new Map();
  const tree = [];

  list.forEach(item => {
    item.children = [];
    map.set(item.id, item);
  });

  list.forEach(item => {
    if (item.parent_id === 0) {
      tree.push(item);
    } else {
      const parent = map.get(item.parent_id);
      if (parent) {
        parent.children.push(item);
      }
    }
  });

  return tree;
}



module.exports = {
   serveMnus
}