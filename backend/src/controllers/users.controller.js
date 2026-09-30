const {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} = require('../services/users.service')

async function list(req, res) {
  const data = await listUsers(req.validated.query)
  res.json(data)
}

async function getById(req, res) {
  const data = await getUserById(req.validated.params.id)
  res.json(data)
}

async function create(req, res) {
  const data = await createUser(req.validated.body)
  res.status(201).json(data)
}

async function update(req, res) {
  const data = await updateUser(req.validated.params.id, req.validated.body)
  res.json(data)
}

async function remove(req, res) {
  await deleteUser(req.validated.params.id, req.user)
  res.status(204).send()
}

module.exports = {
  create,
  getById,
  list,
  remove,
  update,
}
