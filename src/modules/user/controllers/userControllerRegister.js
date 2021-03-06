import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../userModel';
import message from '../../messages/messages';
import codewarsGetUser from '../../codewars/codewarsGetUser';

// 1. Check if mail exist
// 2. Check codewars user if exist
// 3. Create user with codewars data
const userRegister = async (req, res, next) => {
  if (await isUserExist(req, res, next)) {
    return res.status(409).json(message.error('Mail exist.'));
  }
  codewarsGetUser(req.body.codewarsId)
    .then(codewarsUser => {
      if (codewarsUser.message.type === 'success') {
        createUser(req, res, next, codewarsUser.payload);
      } else {
        throw new Error('codewars_user_not_found'); // Express will catch this on its own.
      }
    })
    .catch(err => {
      if (err.message === 'codewars_user_not_found') {
        res.status(409).json(message.error('Wrong codewars URL or user not exist'));
      } else {
        res.status(409).json(message.error(''));
      }
    });
};

export default userRegister;

async function isUserExist(req, res, next, email) {
  const users = await User.find({ email })
    .exec()
    .catch(err => res.status(500).json(message.error(err)));
  return users.length > 0;
}

function createUser(req, res, next, codewarsUser) {
  bcrypt.hash(req.body.password, 10, (bcryptError, hash) => {
    if (bcryptError) {
      return res.status(500).json(message.error(bcryptError));
    }

    const codewarsRecord = {
      timestamp: Date.now(),
      data: codewarsUser,
    };

    const user = new User({
      _id: new mongoose.Types.ObjectId(),
      email: req.body.email,
      name: req.body.name,
      phone: req.body.phone,
      codewarsId: req.body.codewarsId,
      password: hash,
      roles: ['student'],
      codewarsAnalytics: [codewarsRecord, codewarsRecord], // Create 2 same records to have initial data, because we are updating the last one
    });

    user
      .save()
      .then(() => {
        res.status(201).json(message.success('User created'));
      })
      .catch(error => {
        if (error.code === 11000) {
          return res.status(500).json(message.error('User with entered email exist'));
        }
        return res.status(500).json(message.error(error));
      });
  });
}
