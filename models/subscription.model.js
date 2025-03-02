const mongoose = require('mongoose');
const User = require('./user.model');
const Package = require('./packages.model');
const mongoosePaginate = require('mongoose-paginate-v2');

const channelItemSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true,
        required: true,
    },
    bouquet_id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    selected: {
        type: Boolean,
        default: false,
    },
});

const subscriptionSchema = new mongoose.Schema({
    subscription_id: {
        type: Number,
        required: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'package',
        required: true,
    },
    deviceType: {
        type: String,
        enum: ['m3u', 'mac', 'activeCode'],
        required: true,
    },
    deviceDetails: {
        m3u: {
            userName: { type: String },
            password: { type: String },
        },
        mac: {
            macAddress: { type: String },
        },
        activeCode: {
            code: { type: String },
        },
    },
    liveBouquet: [channelItemSchema],
    seriesBouquet: [channelItemSchema],
    vodBouquet: [channelItemSchema],
    paymentMethod: {
        type: String,
        enum: ['paypal', 'stripe', 'googlePay', 'crypto'],
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending',
    },
    paymentId: {
        type: String,
    },
    paymentDate: {
        type: Date,
    },
    activationStatus: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    exp_date: {
        type: Number,
    },
    create_date: {
        type: Number,
    },
});

subscriptionSchema.plugin(mongoosePaginate);
const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;