const mongoose = require('mongoose');
const Subscription = require('../models/subscription.model');
const Package = require('../models/packages.model');
const i18n = require('../config/i18n'); 
const { Paypal , Stripe } = require('./payement.controller')
const MegaController = require('../api/mega.api');

const SubscriptionController = {            
    createSubscription: async (req, res) => {
        try {
            const { 
                userId, 
                packageId, 
                paymentMethod, 
                deviceType, 
                m3uDetails, 
                macDetails, 
                activeCodeDetails, 
                liveBouquet = [], 
                seriesBouquet = [], 
                vodBouquet = [] 
            } = req.body;
    
            if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(packageId)) {
                return res.status(400).json({ error: "Les identifiants de l'utilisateur ou du package ne sont pas valides." });
            }
    
            let deviceDetails;
    
            switch (deviceType) {
                case 'm3u':
                    deviceDetails = {
                        m3u: {
                            userName: m3uDetails.userName || null,
                            password: m3uDetails.password || null,
                        },
                    };
                    break;
                case 'mac':
                    deviceDetails = {
                        mac: {
                            macAddress: macDetails.macAddress || null,
                        },
                    };
                    break;
                case 'activeCode':
                    deviceDetails = {
                        activeCode: {
                            code: activeCodeDetails.code || null,
                        },
                    };
                    break;
                default:
                    return res.status(400).json({ error: 'Type de périphérique invalide.' });
            }
    
            const package = await Package.findById(packageId);
            if (!package) {
                return res.status(404).json({ error: 'Package non trouvé.' });
            }
    
            const currentUnixTime = Math.floor(Date.now() / 1000);
            let subscriptionData = {
                user: userId,
                packageId,
                deviceType,
                deviceDetails,
                liveBouquet,
                seriesBouquet,
                vodBouquet,
                paymentMethod,
                create_date: currentUnixTime,
                exp_date: 0 // sera mis à jour après le succès du paiement
            };
    
            const newSubscription = await Subscription.create(subscriptionData);
    
            // Paiement de l'abonnement
            let paymentResult;
            let approvalUrl;
            if (paymentMethod === 'paypal') {
                paymentResult = await Paypal.paySubscription(req, res, newSubscription._id);
            } else if (paymentMethod === 'stripe') {
                paymentResult = await Stripe.paySubscription(req, newSubscription._id);
            }
    
            if (paymentResult && paymentResult.success) {
                newSubscription.exp_date = currentUnixTime + package.duration * 86400;
                await newSubscription.save();
                approvalUrl = paymentResult.link;
    
                if (deviceType === 'm3u') {
                    const allBouquets = [
                        ...(Array.isArray(liveBouquet) ? liveBouquet.map(item => parseInt(item.bouquet_id, 10)) : []),
                        ...(Array.isArray(seriesBouquet) ? seriesBouquet.map(item => parseInt(item.bouquet_id, 10)) : []),
                        ...(Array.isArray(vodBouquet) ? vodBouquet.map(item => parseInt(item.bouquet_id, 10)) : [])
                    ].filter(Number.isInteger);

                    const m3uCreateResult = await MegaController.M3uCreate(
                        m3uDetails.userName,
                        m3uDetails.password,
                        parseInt(package.package_id, 10),            // package Id
                        1 ,                    // customer_has_paid
                        0 ,                    // enable_vpn
                        1 ,                    // max_connections
                        'all',                               // country
                        'This subscription created through the store', // description
                        '098765432',                         // whatsapp_telegram
                        allBouquets,                         // bouquets
                        parseInt(process.env.MEGA_CLIENT_ID, 10)  // user_id
                    );
    
                    if (m3uCreateResult.error) {
                        return res.status(500).json({ 
                            error: 'Erreur lors de la création de l\'abonnement M3U', 
                            details: m3uCreateResult.details ,
                        });
                    }
                }

                if (deviceType === 'mac') {
                    const allBouquets = [
                        ...(Array.isArray(liveBouquet) ? liveBouquet.map(item => parseInt(item.bouquet_id, 10)) : []),
                        ...(Array.isArray(seriesBouquet) ? seriesBouquet.map(item => parseInt(item.bouquet_id, 10)) : []),
                        ...(Array.isArray(vodBouquet) ? vodBouquet.map(item => parseInt(item.bouquet_id, 10)) : [])
                    ].filter(Number.isInteger);

                    const magCreateResult = await MegaController.MagCreate(
                        macDetails.macAddress,
                        parseInt(package.package_id, 10),            // package Id
                        1 ,                    // customer_has_paid
                        0 ,                    // enable_vpn
                        1 ,                    // max_connections
                        'all',                               // country
                        'This subscription created through the store', // description
                        '098765432',                         // whatsapp_telegram
                        allBouquets,                         // bouquets
                        parseInt(process.env.MEGA_CLIENT_ID, 10)  // user_id
                    );
    
                    if (magCreateResult.error) {
                        return res.status(500).json({ 
                            error: 'Erreur lors de la création de l\'abonnement Mag', 
                            details: magCreateResult.details ,
                        });
                    }
                }

                if (deviceType === 'activeCode') {
                    const allBouquets = [
                        ...(Array.isArray(liveBouquet) ? liveBouquet.map(item => parseInt(item.bouquet_id, 10)) : []),
                        ...(Array.isArray(seriesBouquet) ? seriesBouquet.map(item => parseInt(item.bouquet_id, 10)) : []),
                        ...(Array.isArray(vodBouquet) ? vodBouquet.map(item => parseInt(item.bouquet_id, 10)) : [])
                    ].filter(Number.isInteger);

                    const activecodeCreateResult = await MegaController.ActivecodeCreate(
                        parseInt(1 , 10),       // activecode_device_id
                        parseInt(package.package_id, 10),            // package Id
                        1 ,                    // customer_has_paid
                        0 ,                    // enable_vpn
                        1 ,                    // max_connections
                        'all',                               // country
                        'This subscription created through the store', // description
                        '098765432',                         // whatsapp_telegram
                        allBouquets,                         // bouquets
                        parseInt(process.env.MEGA_CLIENT_ID, 10)  // user_id
                    );
    
                    if (activecodeCreateResult.error) {
                        return res.status(500).json({ 
                            error: 'Erreur lors de la création de l\'abonnement Activecode', 
                            details: activecodeCreateResult.details ,
                        });
                    }
                }
    
                res.status(201).json({ 
                    message: 'Abonnement créé avec succès.', 
                    subscription: newSubscription, 
                    link: approvalUrl 
                });
            } else if (paymentResult && !paymentResult.success) {
                return res.status(500).json({ 
                    error: 'Erreur lors du paiement de l\'abonnement.', 
                    message: paymentResult.message 
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur lors de la création de l\'abonnement.' });
        }
    },    
    countSubscriptions: async (req, res) => {
        try {
            const totalSubscriptions = await Subscription.countDocuments();
            res.status(200).json({ totalSubscriptions });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: i18n.__('subscription.countSubscriptions.error') });
        }
    },
    getAllSubscriptionsByUserId: async (req, res) => {
        try {
            const { userId } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;
            const searchQuery = req.query.search ? req.query.search.trim() : '';
    
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ error: i18n.__('subscription.getAllSubscriptionsByUserId.invalidUserId') });
            }
    
            const filter = {
                user: userId,
                ...(searchQuery && {
                    'packageId.name': { $regex: searchQuery, $options: 'i' }
                })
            };
    
            const totalSubscriptions = await Subscription.countDocuments(filter).exec();
    
            const subscriptions = await Subscription.find(filter)
                .populate('packageId')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .exec();
    
            res.status(200).json({
                subscriptions,
                totalDocs: totalSubscriptions,
                totalPages: Math.ceil(totalSubscriptions / limit),
                currentPage: page,
                limit: limit,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: i18n.__('subscription.getAllSubscriptionsByUserId.error') });
        }
    },    
    getSubscriptionById: async (req, res) => {
        try {
            const { subscriptionId } = req.params;
    
            if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
                return res.status(400).json({ error: i18n.__('subscription.getSubscriptionById.invalidSubscriptionId') });
            }
    
            const subscription = await Subscription.findById(subscriptionId)
                .populate('packageId')
                .exec();
    
            if (!subscription) {
                return res.status(404).json({ error: i18n.__('subscription.getSubscriptionById.notFound') });
            }
    
            const sortedLiveBouquet = subscription.liveBouquet.sort((a, b) => (b.selected ? 1 : -1));
            const sortedSeriesBouquet = subscription.seriesBouquet.sort((a, b) => (b.selected ? 1 : -1));
            const sortedVodBouquet = subscription.vodBouquet.sort((a, b) => (b.selected ? 1 : -1));
    
            res.status(200).json({
                subscription: {
                    ...subscription._doc,
                    liveBouquet: sortedLiveBouquet,
                    seriesBouquet: sortedSeriesBouquet,
                    vodBouquet: sortedVodBouquet,
                },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: i18n.__('subscription.getSubscriptionById.error') });
        }
    },        
    updateSubscription: async (req, res) => {
        try {
            const { userId, packageId, subscriptionId, deviceDetails, liveBouquet, seriesBouquet, vodBouquet } = req.body;
            if (
                !mongoose.Types.ObjectId.isValid(userId) ||
                !mongoose.Types.ObjectId.isValid(packageId) ||
                !mongoose.Types.ObjectId.isValid(subscriptionId)
            ) {
                return res.status(400).json({ error: i18n.__('subscription.updateSubscription.invalidUserPackageSubscriptionId')});
            }
            const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId, packageId });
            if (!subscription) {updateSubscription
                return res.status(404).json({ error: i18n.__('subscription.updateSubscription.notFound') });
            }
            if (deviceDetails) {
                if (deviceDetails.activeCode) {
                    if (
                        !deviceDetails.activeCode.code ||
                        deviceDetails.activeCode.code.length !== 12 ||
                        !/^\d+$/.test(deviceDetails.activeCode.code)
                    ) {
                        return res.status(400).json({ error: i18n.__('subscription.updateSubscription.invalidActiveCodeFormat') });
                    }
                }
                if (deviceDetails.m3u) {
                    if (
                        !deviceDetails.m3u.userName ||
                        !deviceDetails.m3u.password ||
                        deviceDetails.m3u.userName.length !== 8 ||
                        deviceDetails.m3u.password.length !== 8
                    ) {
                        return res.status(400).json({ error: i18n.__('subscription.updateSubscription.invalidM3uFormat') });
                    }
                    }
                if (
                    deviceDetails.mac &&
                    deviceDetails.mac.macAddress &&
                    !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(deviceDetails.mac.macAddress)
                ) {
                    return res.status(400).json({ error:i18n.__('subscription.updateSubscription.invalidMacFormat') });
                }
                subscription.deviceDetails = deviceDetails;
            }
            if (liveBouquet) {
                subscription.liveBouquet = liveBouquet;
                }
            if (seriesBouquet) {
                subscription.seriesBouquet = seriesBouquet;
            }
            if (vodBouquet) {
                subscription.vodBouquet = vodBouquet;
            }
            if (!deviceDetails && !liveBouquet && !seriesBouquet && !vodBouquet) {
                return res.status(200).json({ message: i18n.__('subscription.updateSubscription.noModification'), subscription });
            }
            await subscription.save();
            res.status(200).json({ message: i18n.__('subscription.updateSubscription.success'), subscription });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: i18n.__('subscription.updateSubscription.error') });
        }
    },
    getAllSubscriptionsWithUserAndPackage: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;
            const searchQuery = req.query.search ? req.query.search.trim() : '';
            const filter = {};
    
            if (searchQuery) {
                const regex = new RegExp(searchQuery, 'i');
                filter.$or = [
                    { 'user.FirstName': regex },
                    { 'user.LastName': regex },
                    { 'packageId.name': regex }
                ];
            }

            const totalSubscriptions = await Subscription.countDocuments(filter).exec();
            const subscriptions = await Subscription.find(filter)
                .populate('user')
                .populate('packageId')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .exec();
    
            res.status(200).json({
                subscriptions,
                totalDocs: totalSubscriptions,
                totalPages: Math.ceil(totalSubscriptions / limit),
                currentPage: page,
                limit: limit,
            });
        } catch (error) {
            res.status(500).json({ error: 'Error lors de connexion' });
        }
    },
    disableSubscription: async (req, res) => {
        try {
                const { subscriptionId } = req.body;

            if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
                return res.status(400).json({ error: 'ID d\'abonnement invalide' });
            }

            const updatedSubscription = await Subscription.findByIdAndUpdate(
                subscriptionId,
                { $set: { paymentStatus: 'failed', activationStatus: false } },
                { new: true }
            );

            res.status(200).json({ message: 'Statut d\'abonnement mis à jour avec succès', subscription: updatedSubscription });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur lors de la mise à jour du statut d\'abonnement' });
        }
    },
    enableSubscription: async (req, res) => {
        try {
                const { subscriptionId } = req.body;

            if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
                return res.status(400).json({ error: 'ID d\'abonnement invalide' });
                }

            const updatedSubscription = await Subscription.findByIdAndUpdate(
                subscriptionId,
                { $set: { paymentStatus: 'pending', activationStatus: false } },
                { new: true }
            );

            res.status(200).json({ message: 'Statut d\'abonnement mis à jour avec succès', subscription: updatedSubscription });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur lors de la mise à jour du statut d\'abonnement' });
        }
    },
    deleteSubscription: async (req, res) => {
        try {
            const { subscriptionId } = req.params;
    
            if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
                return res.status(400).json({ error: 'Invalid Subscription Id' });
            }
    
            const subscription = await Subscription.findByIdAndDelete(subscriptionId);
    
            if (!subscription) {
                return res.status(404).json({ error: 'Introuvable Subscription' });
            }
    
            res.status(200).json({ message: 'Supprimer avec succès', deletedSubscription: subscription });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur lors de l\'exécution' });
        }
    },        
};

module.exports = SubscriptionController;